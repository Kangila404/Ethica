import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import type { AuthRepository } from "../domain/repository/auth.repository";
import {AUTH_REPOSITORY} from '../domain/repository/auth.repository'
import { AuthTokenResponse } from "../presentation/dto/res/auth-token-response.dto";
import { User } from "src/user/domain/model/user.entity";
import type {UserRepository } from "src/user/domain/repository/user.repository";
import {USER_REPOSITORY} from "src/user/domain/repository/user.repository";
import { SignupRequest } from "../presentation/dto/req/signup-request.dto";
import {PASSWORD_ENCODER} from '../domain/encoder/password-encoder';
import type { PasswordEncoder } from "../domain/encoder/password-encoder";
import { AuthIdentity } from "../domain/model/auth-identity.entity";
import { JwtService } from "@nestjs/jwt";
import { LoginRequest } from "../presentation/dto/req/login-request.dto";
import { UserStatus } from "src/user/domain/enum/user-status.enum";
import { RefreshTokenRequest } from "../presentation/dto/req/refresh-token-request.dto";
import { Transactional } from 'typeorm-transactional'
import { MessageResponse } from "src/common/dto/res/message-response.dto";
import {REFRESHTOKEN_REPOSITORY} from '../domain/repository/refresh-token.repository';
import type { RefreshTokenRepository } from "../domain/repository/refresh-token.repository";
import { sha256 } from "src/common/util/hash.util";
import { request } from "http";
import { LogoutRequest } from "../presentation/dto/req/refresh-token.dto";
import { RefreshToken } from "../domain/model/refresh-token.entity";

@Injectable()
export class AuthService {
    constructor(
        @Inject(AUTH_REPOSITORY)
        private readonly authRepository:AuthRepository,

        @Inject(USER_REPOSITORY)
        private readonly userRepository:UserRepository,

        
        @Inject(REFRESHTOKEN_REPOSITORY)
        private readonly refreshTokenRepository:RefreshTokenRepository,

        @Inject(PASSWORD_ENCODER)
        private readonly passwordEncoder:PasswordEncoder,


        private readonly jwtService:JwtService,
    ){}

    @Transactional()
    async signup(request:SignupRequest): Promise<AuthTokenResponse>{
        // 1. 비밀번호 일치 확인
        if(request.password !== request.passwordConfirm){
            throw new BadRequestException('비밀번호가 일치하지 않습니다.');
        }

        // 2. 이메일 중복 확인
        const existing = await this.authRepository.findByEmail(request.email);
        if(existing){
            throw new ConflictException('이미 가입된 이메일입니다.');
        }

        // 3. 비밀번호 해싱
        const hashedPassword = await this.passwordEncoder.encode(request.password);

        // 4. 유저 생성
        const user = User.create(request.name);
        await this.userRepository.save(user);

        // 5. AuthIdentity 생성
        const identity = AuthIdentity.createLocal(user.id, request.email, hashedPassword);
        await this.authRepository.save(identity);

        // 6. 토큰 발급
        return this.issueTokens(user);
    }

    async login(request: LoginRequest):Promise<AuthTokenResponse>{
        const auth = await this.findAuthByEmailOrThrow(request.email);
        const user = await this.findUserByIdOrThrow(auth.userId);

        if(user.userStatus === UserStatus.SUSPENDED){
            throw new BadRequestException('해당 유저는 정지 상태입니다.');
        }

        if(!auth.isLocal()){
            throw new UnauthorizedException();
        }

        const isPassword = await this.passwordEncoder.matches(request.password, auth.password);
        if(!isPassword){
            throw new BadRequestException('비밀번호가 일치하지 않습니다.');
        }

        return this.issueTokens(user);
    }

    @Transactional()
    async refreshToken(request:RefreshTokenRequest): Promise<AuthTokenResponse>{
        let payload: {sub: string; type: string};

        try {
            payload = await this.jwtService.verifyAsync(request.refreshToken);
        } catch {
            throw new UnauthorizedException('유효하지 않은 토큰입니다.');
        }

        if(payload.type !== 'refresh') {
            throw new UnauthorizedException('유효하지 않은 토큰입니다.');
        }

        const tokenHash = sha256(request.refreshToken);
        const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);
        if(!stored){
            throw new UnauthorizedException('유효하지 않은 토큰입니다.');
        }

        const user = await this.getUserOrThrow(payload.sub);

        if(user.userStatus === UserStatus.SUSPENDED){
            throw new UnauthorizedException('해당 유저는 정지 상태입니다.');
        }
        
        await this.refreshTokenRepository.deleteByTokenHash(tokenHash);
        return this.issueTokens(user);
    }


    async logout(request: LogoutRequest):Promise<MessageResponse>{
        await this.refreshTokenRepository.deleteByTokenHash(sha256(request.refreshToken));
        return new MessageResponse('로그아웃 되었습니다.');
    }


    // ======================= 메서드 ======================= //
    // 1. (UUID) userId -> User 조회
    private async getUserOrThrow(userId:string):Promise<User> {
        const user = await this.userRepository.findByUserId(userId);
        if(!user){
            throw new NotFoundException('유저를 찾을 수 없습니다.')
        }
        return user;
    }

    // 2. (big int) userId -> User 조회
    private async findUserByIdOrThrow(id:string):Promise<User>{
        const user = await this.userRepository.findById(id);
        if(!user){
            throw new NotFoundException('유저를 찾을 수 없습니다.');
        }
        return user;
    }
    
    // 3. email -> Auth_identity 조회
    private async findAuthByEmailOrThrow(email:string):Promise<AuthIdentity>{
        const auth = await this.authRepository.findByEmail(email);
        if(!auth){
            throw new NotFoundException('계정 정보를 찾을 수 없습니다.')
        }
        
        return auth;
    }
    
    private async issueTokens(user: User): Promise<AuthTokenResponse> {
        const payload = {sub: user.userId};

        const accessToken = await this.jwtService.signAsync(
            {...payload, type: 'access'},
            {expiresIn: '30m'},
        );

        const refreshToken = await this.jwtService.signAsync(
            { ...payload, type: 'refresh' },
            { expiresIn: '14d' },
        );

        const { exp } = this.jwtService.decode(refreshToken) as {exp: number};

        await this.refreshTokenRepository.save(
            RefreshToken.issue(user.id, sha256(refreshToken), new Date(exp * 1000))
        );

        return AuthTokenResponse.of(accessToken, refreshToken, user);
        }

}