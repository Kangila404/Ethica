import { ApiProperty } from '@nestjs/swagger';

const ONBOARDING_QUESTION_COUNT = 5;

export class OnboardingAnswerResponse {
  @ApiProperty({ example: 4 })
  answeredCount!: number;

  @ApiProperty({ example: 5 })
  totalCount!: number;

  static of(answeredCount: number): OnboardingAnswerResponse {
    const dto = new OnboardingAnswerResponse();
    dto.answeredCount = answeredCount;
    dto.totalCount = ONBOARDING_QUESTION_COUNT;
    return dto;
  }
}
