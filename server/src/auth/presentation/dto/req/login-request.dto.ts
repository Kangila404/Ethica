import { ApiProperty } from '@nestjs/swagger';

export class LoginRequest {
  @ApiProperty({ example: 'user@example.com', description: '이메일 입력' })
  email!: string;

  @ApiProperty({ example: 'user123!!', description: '비밀번호 입력' })
  password!: string;
}
