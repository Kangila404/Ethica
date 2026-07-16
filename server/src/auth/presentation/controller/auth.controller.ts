import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from 'src/auth/application/auth.service';
import { SignupRequest } from '../dto/req/signup-request.dto';
import { AuthTokenResponse } from '../dto/res/auth-token-response.dto';
import { LoginRequest } from '../dto/req/login-request.dto';
import { RefreshTokenRequest } from '../dto/req/refresh-token-request.dto';
import { MessageResponse } from 'src/common/dto/res/message-response.dto';
import { LogoutRequest } from '../dto/req/refresh-token.dto';

@ApiTags('AUTH API')
@Controller('/api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/signup/email')
  @ApiOperation({ summary: '로컬 회원가입' })
  signup(@Body() request: SignupRequest): Promise<AuthTokenResponse> {
    return this.authService.signup(request);
  }

  @Post('/login/email')
  @ApiOperation({ summary: '로컬 로그인' })
  login(@Body() request: LoginRequest): Promise<AuthTokenResponse> {
    return this.authService.login(request);
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
