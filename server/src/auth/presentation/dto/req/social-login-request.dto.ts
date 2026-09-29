import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuthType } from '../../../domain/enums/auth-Type.enum';

export class SocialChallengeRequest {
  @ApiProperty({ enum: AuthType })
  @IsEnum(AuthType)
  provider!: AuthType;
}
export class SocialLoginRequest extends SocialChallengeRequest {
  @ApiProperty({ description: '서버가 발급한 일회성 로그인 challenge ID' })
  @IsUUID('4')
  challengeId!: string;

  @ApiProperty({
    description: '제공자가 발급한 OIDC ID token (access token 아님)',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(16384)
  idToken!: string;
}
