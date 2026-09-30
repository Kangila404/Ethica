import { ApiProperty } from '@nestjs/swagger';
import { OnboardingStatus } from 'src/user/domain/enum/OnboardingStatus.enum';
import { User } from 'src/user/domain/model/user.entity';

export class UserResponse {
  @ApiProperty({ example: '외부 노출용 유저 ID' })
  userId!: string;

  name!: string;
  userRole!: string;

  @ApiProperty({ enum: OnboardingStatus })
  onboardingStatus!: OnboardingStatus;

  @ApiProperty({ example: '08:00' })
  dailyQuestionTime!: string;

  @ApiProperty({ example: 'Asia/Seoul' })
  timezone!: string;

  nextDailyAt!: Date | null;
  dailyScheduleEffectiveAt!: Date | null;
  pendingDailyQuestionTime!: string | null;
  pendingTimezone!: string | null;

  @ApiProperty({ example: true })
  notificationEnabled!: boolean;

  static from(user: User): UserResponse {
    const dto = new UserResponse();

    dto.userId = user.userId;
    dto.name = user.name;
    dto.userRole = user.userRole;
    dto.onboardingStatus = user.onboardingStatus;
    dto.dailyQuestionTime = user.dailyQuestionTime;
    dto.timezone = user.timezone;
    dto.nextDailyAt = user.nextDailyAt;
    dto.dailyScheduleEffectiveAt = user.dailyScheduleEffectiveAt;
    dto.pendingDailyQuestionTime = user.pendingDailyQuestionTime;
    dto.pendingTimezone = user.pendingTimezone;
    dto.notificationEnabled = user.notificationEnabled;
    return dto;
  }
}
