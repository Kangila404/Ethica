import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthRepository } from '../domain/repository/auth.repository';
import { AUTH_REPOSITORY } from '../domain/repository/auth.repository';
import { AuthTokenResponse } from '../presentation/dto/res/auth-token-response.dto';
import { User } from 'src/user/domain/model/user.entity';
import type { UserRepository } from 'src/user/domain/repository/user.repository';
import { USER_REPOSITORY } from 'src/user/domain/repository/user.repository';
import { AuthIdentity } from '../domain/model/auth-identity.entity';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from 'src/user/domain/enum/user-status.enum';
import { RefreshTokenRequest } from '../presentation/dto/req/refresh-token-request.dto';
import { Transactional } from 'typeorm-transactional';
import { MessageResponse } from 'src/common/dto/res/message-response.dto';
import { REFRESHTOKEN_REPOSITORY } from '../domain/repository/refresh-token.repository';
import type { RefreshTokenRepository } from '../domain/repository/refresh-token.repository';
import { sha256 } from 'src/common/util/hash.util';
import { LogoutRequest } from '../presentation/dto/req/refresh-token.dto';
import { RefreshToken } from '../domain/model/refresh-token.entity';
import { randomBytes, randomUUID } from 'crypto';
import {
  SOCIAL_TOKEN_VERIFIER,
  type SocialTokenVerifier,
  type SocialProfile,
} from '../domain/client/social-token-verifier';
import {
  AUTH_CHALLENGE_REPOSITORY,
  type AuthChallengeRepository,
} from '../domain/repository/auth-challenge.repository';
import { AuthChallenge } from '../domain/model/auth-challenge.entity';
import {
  SocialLoginRequest,
  SocialChallengeRequest,
} from '../presentation/dto/req/social-login-request.dto';
import { SocialChallengeResponse } from '../presentation/dto/res/social-challenge-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepository,

    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,

    @Inject(REFRESHTOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,

    @Inject(SOCIAL_TOKEN_VERIFIER)
    private readonly socialVerifier: SocialTokenVerifier,

    @Inject(AUTH_CHALLENGE_REPOSITORY)
    private readonly challenges: AuthChallengeRepository,

    private readonly jwtService: JwtService,
  ) {}

  async createChallenge(
    request: SocialChallengeRequest,
  ): Promise<SocialChallengeResponse> {
    this.socialVerifier.assertConfigured(request.provider);
    const challenge = new AuthChallenge();
    Object.assign(challenge, {
      id: randomUUID(),
      provider: request.provider,
      nonce: randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 300000),
    });
    await this.challenges.save(challenge);
    return SocialChallengeResponse.from(challenge);
  }

  async socialLogin(request: SocialLoginRequest): Promise<AuthTokenResponse> {
    const challenge = await this.challenges.findValid(request.challengeId);
    if (!challenge || challenge.provider !== request.provider)
      throw this.invalidChallenge();
    const profile = await this.socialVerifier.verify(
      request.provider,
      request.idToken,
      challenge.nonce,
    );
    try {
      return await this.completeSocialLogin(challenge.id, profile);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException({
          code: 'AUTH_LOGIN_CONFLICT',
          message:
            '동시에 가입 요청이 처리됐습니다. 로그인을 다시 시도해주세요.',
        });
      }
      throw error;
    }
  }

  @Transactional()
  async completeSocialLogin(
    challengeId: string,
    profile: SocialProfile,
  ): Promise<AuthTokenResponse> {
    if (!(await this.challenges.consume(challengeId)))
      throw this.invalidChallenge();
    const identity = await this.authRepository.findByProvider(
      profile.provider,
      profile.subject,
    );
    let user: User;
    if (identity) {
      const existing = await this.userRepository.findById(identity.userId);
      if (!existing || existing.userStatus !== UserStatus.ACTIVE) {
        throw new UnauthorizedException({
          code: 'AUTH_ACCOUNT_UNAVAILABLE',
          message: '사용할 수 없는 계정입니다.',
        });
      }
      user = existing;
    } else {
      const name =
        Array.from((profile.name ?? '').replace(/[\p{Cc}\p{Cf}]/gu, '').trim())
          .slice(0, 10)
          .join('') || '생각하는 사람';
      user = User.create(name);
      await this.userRepository.save(user);
      await this.authRepository.save(
        AuthIdentity.createSocial(
          user.id,
          profile.provider,
          profile.subject,
          profile.email,
        ),
      );
    }
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);
    return this.issueTokens(user);
  }

  private invalidChallenge(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'AUTH_INVALID_CHALLENGE',
      message: '로그인 요청이 만료됐거나 이미 사용됐습니다. 다시 시작해주세요.',
    });
  }

  @Transactional()
  async refreshToken(request: RefreshTokenRequest): Promise<AuthTokenResponse> {
    let payload: { sub: string; type: string };

    try {
      payload = await this.jwtService.verifyAsync<{
        sub: string;
        type: string;
      }>(request.refreshToken);
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    const tokenHash = sha256(request.refreshToken);
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (!stored || stored.expiredAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    const user = await this.getUserOrThrow(payload.sub);

    if (user.userStatus !== UserStatus.ACTIVE || stored.userId !== user.id) {
      throw new UnauthorizedException('해당 유저는 정지 상태입니다.');
    }

    const deleted =
      await this.refreshTokenRepository.deleteByTokenHash(tokenHash);
    if (deleted === 0) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    return this.issueTokens(user);
  }

  async logout(request: LogoutRequest): Promise<MessageResponse> {
    await this.refreshTokenRepository.deleteByTokenHash(
      sha256(request.refreshToken),
    );
    return new MessageResponse('로그아웃 되었습니다.');
  }

  // ======================= 메서드 ======================= //
  // 1. (UUID) userId -> User 조회
  private async getUserOrThrow(userId: string): Promise<User> {
    const user = await this.userRepository.findByUserId(userId);
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }
    return user;
  }

  private async issueTokens(user: User): Promise<AuthTokenResponse> {
    const payload = { sub: user.userId };

    const accessToken = await this.jwtService.signAsync(
      { ...payload, type: 'access' },
      { expiresIn: '30m' },
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...payload, type: 'refresh', jti: randomUUID() },
      { expiresIn: '14d' },
    );

    const { exp } = this.jwtService.decode<{ exp: number }>(refreshToken);

    await this.refreshTokenRepository.save(
      RefreshToken.issue(user.id, sha256(refreshToken), new Date(exp * 1000)),
    );

    return AuthTokenResponse.of(accessToken, refreshToken, user);
  }
}
