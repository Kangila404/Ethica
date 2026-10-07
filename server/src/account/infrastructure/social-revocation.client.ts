import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';
import { AuthType } from 'src/auth/domain/enums/auth-Type.enum';
import {
  SOCIAL_TOKEN_VERIFIER,
  type SocialTokenVerifier,
} from 'src/auth/domain/client/social-token-verifier';
import type {
  RevocationClient,
  RevocationCredential,
} from '../domain/revocation-client';
@Injectable()
export class SocialRevocationClient implements RevocationClient {
  constructor(
    private readonly config: ConfigService,
    @Inject(SOCIAL_TOKEN_VERIFIER)
    private readonly verifier: SocialTokenVerifier,
  ) {}
  private appleConfig() {
    const clientId = this.config.get<string>('APPLE_REVOCATION_CLIENT_ID');
    const teamId = this.config.get<string>('APPLE_TEAM_ID');
    const keyId = this.config.get<string>('APPLE_KEY_ID');
    const privateKey = this.config
      .get<string>('APPLE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');
    if (!clientId || !teamId || !keyId || !privateKey)
      throw new ServiceUnavailableException({
        code: 'SOCIAL_REVOCATION_NOT_CONFIGURED',
        message: 'Apple 연결 해제 설정이 필요합니다.',
      });
    const secret = sign({}, privateKey, {
      algorithm: 'ES256',
      keyid: keyId,
      issuer: teamId,
      audience: 'https://appleid.apple.com',
      subject: clientId,
      expiresIn: '5m',
    });
    return { client_id: clientId, client_secret: secret };
  }
  private async call(url: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
    } catch {
      throw new ServiceUnavailableException(
        '소셜 제공자에 연결할 수 없습니다.',
      );
    }
  }
  async prepare(
    provider: AuthType,
    subject: string,
    credential: string,
    nonce: string,
  ): Promise<RevocationCredential> {
    if (provider === AuthType.APPLE) {
      const config = this.appleConfig();
      const response = await this.call('https://appleid.apple.com/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          ...config,
          grant_type: 'authorization_code',
          code: credential,
        }),
      });
      if (!response.ok)
        throw new UnauthorizedException(
          'Apple 재인증 코드가 유효하지 않습니다.',
        );
      const data = (await response.json()) as {
        id_token?: string;
        refresh_token?: string;
      };
      if (!data.id_token || !data.refresh_token)
        throw new UnauthorizedException('Apple 인증 응답이 올바르지 않습니다.');
      const profile = await this.verifier.verify(
        provider,
        data.id_token,
        nonce,
      );
      if (profile.subject !== subject)
        throw new UnauthorizedException('연결 해제 계정이 다릅니다.');
      return {
        provider,
        token: data.refresh_token,
        clientId: config.client_id,
      };
    }
    if (provider === AuthType.GOOGLE) {
      const response = await this.call(
        'https://oauth2.googleapis.com/tokeninfo',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + credential,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      if (!response.ok)
        throw new UnauthorizedException(
          'Google 재인증 토큰이 유효하지 않습니다.',
        );
      const data = (await response.json()) as {
        sub?: string;
        aud?: string;
        expires_in?: string;
      };
      const audiences = (this.config.get<string>('GOOGLE_CLIENT_IDS') ?? '')
        .split(',')
        .map((s) => s.trim());
      if (
        data.sub !== subject ||
        !data.aud ||
        !audiences.includes(data.aud) ||
        !Number.isFinite(Number(data.expires_in)) ||
        Number(data.expires_in) <= 0 ||
        !data.expires_in
      )
        throw new UnauthorizedException(
          'Google 연결 해제 계정 또는 앱이 다릅니다.',
        );
    } else {
      const response = await this.call(
        'https://kapi.kakao.com/v1/user/access_token_info',
        { headers: { Authorization: 'Bearer ' + credential } },
      );
      if (!response.ok)
        throw new UnauthorizedException(
          'Kakao 재인증 토큰이 유효하지 않습니다.',
        );
      const data = (await response.json()) as {
        id?: number | string;
        app_id?: number | string;
        expires_in?: number;
      };
      const appId = this.config.get<string>('KAKAO_APP_ID');
      if (!appId)
        throw new ServiceUnavailableException({
          code: 'SOCIAL_REVOCATION_NOT_CONFIGURED',
          message: 'Kakao 앱 ID 설정이 필요합니다.',
        });
      if (
        String(data.id) !== subject ||
        String(data.app_id) !== appId ||
        !data.expires_in ||
        data.expires_in <= 0
      )
        throw new UnauthorizedException(
          'Kakao 연결 해제 계정 또는 앱이 다릅니다.',
        );
    }
    if (
      provider === AuthType.KAKAO &&
      !this.config.get<string>('KAKAO_ADMIN_KEY')
    )
      throw new ServiceUnavailableException({
        code: 'SOCIAL_REVOCATION_NOT_CONFIGURED',
        message: 'Kakao 연결 해제 키 설정이 필요합니다.',
      });
    return {
      provider,
      token: provider === AuthType.KAKAO ? '' : credential,
      subject,
    };
  }
  async revoke(credential: RevocationCredential): Promise<void> {
    let response: Response;
    if (credential.provider === AuthType.APPLE) {
      const config = this.appleConfig();
      if (config.client_id !== credential.clientId)
        throw new Error('APPLE_CLIENT_CHANGED');
      response = await this.call('https://appleid.apple.com/auth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          ...config,
          token: credential.token,
          token_type_hint: 'refresh_token',
        }),
      });
    } else if (credential.provider === AuthType.GOOGLE) {
      response = await this.call('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: credential.token }),
      });
    } else {
      response = await this.call('https://kapi.kakao.com/v1/user/unlink', {
        method: 'POST',
        headers: {
          Authorization:
            'KakaoAK ' + this.config.getOrThrow<string>('KAKAO_ADMIN_KEY'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          target_id_type: 'user_id',
          target_id: credential.subject!,
        }),
      });
    }
    if (credential.provider === AuthType.KAKAO && response.status === 400) {
      const body = (await response.json()) as { code?: number };
      if (body.code === -101) return;
    }
    if (!response.ok) throw new Error('SOCIAL_REVOCATION_FAILED');
  }
}
