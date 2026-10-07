import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenRequest {
  @ApiProperty({
    example: 'ffdskfjdsjkfsdkl-dasdasdasdsad-dadsaddasdas-ddasdasdasds',
    description: '리프레시 토큰',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(16384)
  refreshToken!: string;
}
