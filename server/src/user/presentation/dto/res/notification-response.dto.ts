import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/user/domain/model/user.entity';

export class NotificationResponse {
  @ApiProperty({ example: true })
  notificationEnabled!: boolean;

  static from(user: User): NotificationResponse {
    const dto = new NotificationResponse();
    dto.notificationEnabled = user.notificationEnabled;
    return dto;
  }
}
