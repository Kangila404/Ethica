import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../user/domain/repository/user.repository';
import { UserStatus } from '../../../user/domain/enum/user-status.enum';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; type: string }) {
    if (payload.type !== 'access' || typeof payload.sub !== 'string') {
      throw new UnauthorizedException();
    }
    const user = await this.users.findByUserId(payload.sub);
    if (!user || user.userStatus !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'AUTH_ACCOUNT_UNAVAILABLE',
        message: '사용할 수 없는 계정입니다.',
      });
    }
    return { userId: user.userId, role: user.userRole };
  }
}
