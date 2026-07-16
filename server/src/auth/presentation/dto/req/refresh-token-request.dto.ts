import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenRequest {
  @ApiProperty({
    example: 'ffdskfjdsjkfsdkl-dasdasdasdsad-dadsaddasdas-ddasdasdasds',
    description: '리프레시 토큰',
  })
  refreshToken!: string;
}
