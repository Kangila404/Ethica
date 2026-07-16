import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/user/domain/model/user.entity';

const ONBOARDING_QUESTION_COUNT = 5;

export class OnboardingStatusResponse {
  @ApiProperty({ example: '3', description: '관심 카테고리 id' })
  interestCategoryId!: string | null;

  @ApiProperty({ example: '4', description: '답한 문제 갯수' })
  answeredCount!: number;

  @ApiProperty({ example: '5', description: '전체 문제 갯수' })
  totalCount!: number;

  @ApiProperty({ example: '13', description: '다음 문제 번호' })
  nextQuestionIndex!: number;

  static of(user: User, answeredCount: number): OnboardingStatusResponse {
    const dto = new OnboardingStatusResponse();
    dto.interestCategoryId = user.interestCategoryId;
    dto.answeredCount = answeredCount;
    dto.totalCount = ONBOARDING_QUESTION_COUNT;
    dto.nextQuestionIndex = answeredCount;
    return dto;
  }
}
