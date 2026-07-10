import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthIdentity } from "./domain/model/auth-identity.entity";
import { AuthController } from "./presentation/controller/auth.controller";
import { AUTH_REPOSITORY } from "./domain/repository/auth.repository";
import { AuthRepositoryImpl } from "./infrastructure/persistence/repository/auth.repository.impl";
import { PASSWORD_ENCODER } from "./domain/encoder/password-encoder";
import { BcryptPasswordEncoder } from "./infrastructure/persistence/encoder/bcrypt-password-encoder";
import {JwtModule} from '@nestjs/jwt';
import { AuthService } from "./application/auth.service";
import { UserModule } from "src/user/user.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { REFRESHTOKEN_REPOSITORY } from "./domain/repository/refresh-token.repository";
import { RefreshTokenRepositoryImpl } from "./infrastructure/persistence/refresh-token.repository.impl";
import { RefreshToken } from "./domain/model/refresh-token.entity";
 
@Module({
    imports: [
        TypeOrmModule.forFeature([AuthIdentity, RefreshToken]),
        UserModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '30m' },
            }),
        }),
    ],
    controllers: [AuthController],
        providers: [
        AuthService,
        {provide: AUTH_REPOSITORY, useClass: AuthRepositoryImpl},
        { provide: PASSWORD_ENCODER, useClass: BcryptPasswordEncoder },
        { provide: REFRESHTOKEN_REPOSITORY, useClass: RefreshTokenRepositoryImpl}, 
    
    ]
})

export class AuthModule {}