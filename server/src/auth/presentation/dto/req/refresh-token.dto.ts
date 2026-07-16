import { ApiProperty } from '@nestjs/swagger';

export class LogoutRequest {
  @ApiProperty({
    example:
      'dfegmdfgmfdklgmdfgkldfg-gjdfkgmdfgdflgdfmlgdf-dfgmdfgdfmgldfgk-dgdfgfdgf',
    description: 'refresh_token',
  })
  refreshToken!: string;
}
