import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decode, verify, type JwtPayload } from 'jsonwebtoken';
import { JwksClient, SigningKeyNotFoundError } from 'jwks-rsa';
import { AuthType } from '../../domain/enums/auth-Type.enum';
import {
  SocialProfile,
  SocialTokenVerifier,
} from '../../domain/client/social-token-verifier';

const PROVIDERS = {
  [AuthType.GOOGLE]: {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    config: 'GOOGLE_CLIENT_IDS',
  },
  [AuthType.APPLE]: {
    issuer: ['https://appleid.apple.com'],
    jwksUri: 'https://appleid.apple.com/auth/keys',
    config: 'APPLE_CLIENT_IDS',
  },
  [AuthType.KAKAO]: {
    issuer: ['https://kauth.kakao.com'],
    jwksUri: 'https://kauth.kakao.com/.well-known/jwks.json',
    config: 'KAKAO_CLIENT_IDS',
  },
};

@Injectable()
export class OidcTokenVerifier implements SocialTokenVerifier {
  private readonly clients = new Map<AuthType, JwksClient>();
  constructor(private readonly config: ConfigService) {
    for (const provider of Object.values(AuthType)) {
      this.clients.set(
        provider,
        new JwksClient({
          jwksUri: PROVIDERS[provider].jwksUri,
          cache: true,
          cacheMaxAge: 600000,
          rateLimit: true,
          jwksRequestsPerMinute: 10,
          timeout: 5000,
        }),
      );
    }
  }
  assertConfigured(provider: AuthType): void {
    this.audiences(provider);
  }

  async verify(
    provider: AuthType,
    idToken: string,
    nonce: string,
  ): Promise<SocialProfile> {
    const audiences = this.audiences(provider);
    const token = decode(idToken, { complete: true });
    if (
      !token ||
      token.header.alg !== 'RS256' ||
      typeof token.header.kid !== 'string' ||
      !token.header.kid ||
      token.header.kid.length > 256
    ) {
      throw this.invalid();
    }
    let publicKey: string;
    try {
      const key = await this.clients
        .get(provider)!
        .getSigningKey(token.header.kid);
      publicKey = key.getPublicKey();
    } catch (error) {
      if (error instanceof SigningKeyNotFoundError) throw this.invalid();
      throw new ServiceUnavailableException({
        code: 'AUTH_PROVIDER_UNAVAILABLE',
        message:
          '소셜 인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
      });
    }
    let claims: JwtPayload;
    try {
      const payload = verify(idToken, publicKey, {
        algorithms: ['RS256'],
        audience: audiences as [string, ...string[]],
        issuer: PROVIDERS[provider].issuer as [string, ...string[]],
        nonce,
        clockTolerance: 5,
      });
      if (typeof payload === 'string') throw this.invalid();
      claims = payload;
      if (
        typeof claims.sub !== 'string' ||
        !claims.sub ||
        claims.sub.length > 255 ||
        !Number.isFinite(claims.exp) ||
        !Number.isFinite(claims.iat) ||
        claims.iat! > Date.now() / 1000 + 5 ||
        claims.nonce !== nonce
      )
        throw this.invalid();
      if (
        Array.isArray(claims.aud) &&
        claims.aud.length > 1 &&
        typeof claims.azp !== 'string'
      )
        throw this.invalid();
      if (
        claims.azp !== undefined &&
        (typeof claims.azp !== 'string' || !audiences.includes(claims.azp))
      )
        throw this.invalid();
    } catch {
      throw this.invalid();
    }
    const verifiedEmail =
      claims.email_verified === true || claims.email_verified === 'true';
    const email =
      verifiedEmail &&
      typeof claims.email === 'string' &&
      claims.email.length <= 255
        ? claims.email
        : null;
    const name: unknown = claims.name ?? claims.nickname;
    return {
      provider,
      subject: claims.sub,
      email,
      name: typeof name === 'string' ? name : null,
    };
  }

  private audiences(provider: AuthType): string[] {
    const entry = PROVIDERS[provider];
    if (!entry) throw this.invalid();
    const values = (this.config.get<string>(entry.config) ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (!values.length)
      throw new ServiceUnavailableException({
        code: 'AUTH_PROVIDER_NOT_CONFIGURED',
        message: '해당 소셜 로그인 설정이 준비되지 않았습니다.',
      });
    return values;
  }
  private invalid(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'AUTH_INVALID_SOCIAL_TOKEN',
      message: '소셜 인증 정보가 유효하지 않습니다.',
    });
  }
}
