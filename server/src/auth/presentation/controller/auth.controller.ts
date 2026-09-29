import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from 'src/auth/application/auth.service';
import {
  SocialLoginRequest,
  SocialChallengeRequest,
} from '../dto/req/social-login-request.dto';
import { SocialChallengeResponse } from '../dto/res/social-challenge-response.dto';
import { AuthTokenResponse } from '../dto/res/auth-token-response.dto';
import { RefreshTokenRequest } from '../dto/req/refresh-token-request.dto';
import { MessageResponse } from 'src/common/dto/res/message-response.dto';
import { LogoutRequest } from '../dto/req/refresh-token.dto';

@ApiTags('AUTH API')
@Controller('/api/auth')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/social/challenge')
  @ApiOperation({ summary: '소셜 로그인 nonce 발급 (5분, 일회성)' })
  challenge(
    @Body() request: SocialChallengeRequest,
  ): Promise<SocialChallengeResponse> {
    return this.authService.createChallenge(request);
  }

  @Post('/login/social')
  @ApiOperation({
    summary: 'Google·Apple·Kakao 통합 로그인, 최초 로그인 시 가입',
  })
  login(@Body() request: SocialLoginRequest): Promise<AuthTokenResponse> {
    return this.authService.socialLogin(request);
  }

  @Post('/token/refresh')
  @ApiOperation({ summary: 'refresh Token 재발급' })
  refreshToken(
    @Body() request: RefreshTokenRequest,
  ): Promise<AuthTokenResponse> {
    return this.authService.refreshToken(request);
  }

  @Post('/logout')
  @ApiOperation({ summary: '로그아웃' })
  logout(@Body() request: LogoutRequest): Promise<MessageResponse> {
    return this.authService.logout(request);
  }
}
