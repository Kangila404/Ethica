import { ApiProperty } from '@nestjs/swagger';

export class NicknameUpdateRequest {
  @ApiProperty({ example: 'new_nickname', description: '변경할 닉네임' })
  name!: string;
}
