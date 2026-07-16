import { ApiProperty } from '@nestjs/swagger';
import { OnboardingStatus } from 'src/user/domain/enum/OnboardingStatus.enum';
import { User } from 'src/user/domain/model/user.entity';

export class DailyTimeResponse {
  @ApiProperty({ enum: OnboardingStatus })
  onboardingStatus!: OnboardingStatus;

  @ApiProperty({ example: '위젯 전송 시간' })
  dailyQuestionTime!: string;

  static from(user: User): DailyTimeResponse {
    const dto = new DailyTimeResponse();

    dto.onboardingStatus = user.onboardingStatus;
    dto.dailyQuestionTime = user.dailyQuestionTime;

    return dto;
  }
}
