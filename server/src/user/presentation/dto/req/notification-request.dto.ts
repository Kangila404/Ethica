import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class NotificationRequest {
  @ApiProperty({ example: 'true', description: '알림 설정' })
  @IsBoolean()
  notificationEnabled!: boolean;
}
