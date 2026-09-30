import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { SocialLoginRequest } from 'src/auth/presentation/dto/req/social-login-request.dto';
export class WithdrawalRequest extends SocialLoginRequest {
  @ApiProperty({
    description:
      'Google/Kakao access token 또는 Apple authorization code. ID token과 같은 계정이어야 함',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(16384)
  credential!: string;
}
