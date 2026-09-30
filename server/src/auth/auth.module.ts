import { AuthChallenge } from './domain/model/auth-challenge.entity';
import { AUTH_CHALLENGE_REPOSITORY } from './domain/repository/auth-challenge.repository';
import { AuthChallengeRepositoryImpl } from './infrastructure/persistence/repository/auth-challenge.repository.impl';
import { SOCIAL_TOKEN_VERIFIER } from './domain/client/social-token-verifier';
import { OidcTokenVerifier } from './infrastructure/social/oidc-token-verifier';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthIdentity } from './domain/model/auth-identity.entity';
import { AuthController } from './presentation/controller/auth.controller';
import { AUTH_REPOSITORY } from './domain/repository/auth.repository';
import { AuthRepositoryImpl } from './infrastructure/persistence/repository/auth.repository.impl';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './application/auth.service';
import { UserModule } from 'src/user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { REFRESHTOKEN_REPOSITORY } from './domain/repository/refresh-token.repository';
import { RefreshTokenRepositoryImpl } from './infrastructure/persistence/repository/refresh-token.repository.impl';
import { RefreshToken } from './domain/model/refresh-token.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthIdentity, RefreshToken, AuthChallenge]),
    PassportModule,
    UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: AUTH_REPOSITORY, useClass: AuthRepositoryImpl },
    { provide: SOCIAL_TOKEN_VERIFIER, useClass: OidcTokenVerifier },
    {
      provide: AUTH_CHALLENGE_REPOSITORY,
      useClass: AuthChallengeRepositoryImpl,
    },
    { provide: REFRESHTOKEN_REPOSITORY, useClass: RefreshTokenRepositoryImpl },
    JwtStrategy,
  ],
  exports: [PassportModule, SOCIAL_TOKEN_VERIFIER, AUTH_CHALLENGE_REPOSITORY],
})
export class AuthModule {}
