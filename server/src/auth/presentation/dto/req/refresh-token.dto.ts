import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutRequest {
  @ApiProperty({
    example:
      'dfegmdfgmfdklgmdfgkldfg-gjdfkgmdfgdflgdfmlgdf-dfgmdfgdfmgldfgk-dgdfgfdgf',
    description: 'refresh_token',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(16384)
  refreshToken!: string;
}
