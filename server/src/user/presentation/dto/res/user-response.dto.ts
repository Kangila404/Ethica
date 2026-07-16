import { ApiProperty } from '@nestjs/swagger';
import { OnboardingStatus } from 'src/user/domain/enum/OnboardingStatus.enum';
import { User } from 'src/user/domain/model/user.entity';

export class UserResponse {
  @ApiProperty({ example: '외부 노출용 유저 ID' })
  userId!: string;

  name!: string;

  @ApiProperty({ enum: OnboardingStatus })
  onboardingStatus!: OnboardingStatus;

  @ApiProperty({ example: '08:00' })
  dailyQuestionTime!: string;

  @ApiProperty({ example: 'Asia/Seoul' })
  timezone!: string;

  @ApiProperty({ example: true })
  notificationEnabled!: boolean;

  static from(user: User): UserResponse {
    const dto = new UserResponse();

    dto.userId = user.userId;
    dto.name = user.name;
    dto.onboardingStatus = user.onboardingStatus;
    dto.dailyQuestionTime = user.dailyQuestionTime;
    dto.timezone = user.timezone;
    dto.notificationEnabled = user.notificationEnabled;
    return dto;
  }
}
