import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { User } from 'src/user/domain/model/user.entity';
import { USER_REPOSITORY } from 'src/user/domain/repository/user.repository';
import type { UserRepository } from 'src/user/domain/repository/user.repository';
import { DailyTimeRequest } from 'src/user/presentation/dto/req/dailyTime-request.dto';
import { DailyTimeResponse } from '../presentation/dto/res/dailyTime-response.dto';
import { OnboardingStatusResponse } from '../presentation/dto/res/onboarding-status-response.dto';
import { USER_ANSWER_REPOSITORY } from 'src/user-answer/domain/repository/user-answer.repository';
import type { UserAnswerRepository } from 'src/user-answer/domain/repository/user-answer.repository';
import { USER_FOLLOWUP_ANSWER_REPOSITORY } from 'src/user-answer/domain/repository/user-followup-answer.repository';
import type { UserFollowupAnswerRepository } from 'src/user-answer/domain/repository/user-followup-answer.repository';
import { OnboardingQuestionsResponse } from '../presentation/dto/res/onboarding-question-response.dto';
import { OnboardingAnswerRequest } from '../presentation/dto/req/onboarding-answer-request.dto';
import { OnboardingAnswerResponse } from '../presentation/dto/res/onboarding-answer-response.dto';
import { OnboardingCategoryResponse } from '../presentation/dto/res/onboarding-category-response.dto';
import { OnboardingCategoryRequest } from '../presentation/dto/req/onboarding-category-request.dto';
import { QUESTION_REPOSITORY } from 'src/question/domain/repository/question.repository';
import type { QuestionRepository } from 'src/question/domain/repository/question.repository';
import { UserAnswer } from 'src/user-answer/domain/model/user-answer.entity';
import { UserFollowupAnswer } from 'src/user-answer/domain/model/user-followup-answer.entity';
@Injectable()
export class OnboardingService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,

    @Inject(USER_ANSWER_REPOSITORY)
    private readonly userAnswerRepository: UserAnswerRepository,

    @Inject(USER_FOLLOWUP_ANSWER_REPOSITORY)
    private readonly userFollowupAnswerRepository: UserFollowupAnswerRepository,

    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
  ) {}

  async registerDailyTime(
    userId: string,
    request: DailyTimeRequest,
  ): Promise<DailyTimeResponse> {
    const user = await this.getUserOrThrow(userId);
    user.changeDailyTime(request.dailyQuestionTime, request.timezone);
    await this.userRepository.save(user);
    return DailyTimeResponse.from(user);
  }

  async getOnboardingStatus(userId: string): Promise<OnboardingStatusResponse> {
    const user = await this.getUserOrThrow(userId);
    const answeredCount = await this.userAnswerRepository.countByUserId(
      user.id,
      true,
    );
    return OnboardingStatusResponse.of(user, answeredCount);
  }

  async selectCategory(
    userId: string,
    request: OnboardingCategoryRequest,
  ): Promise<OnboardingCategoryResponse> {
    const user = await this.getUserOrThrow(userId);
    user.selectInterestCategory(request.categoryId);
    await this.userRepository.save(user);
    return OnboardingCategoryResponse.of(user);
  }

  async getOnboardingQuestions(
    userId: string,
  ): Promise<OnboardingQuestionsResponse> {
    const user = await this.getUserOrThrow(userId);

    if (!user.interestCategoryId) {
      throw new BadRequestException('관심 분야를 먼저 선택해주세요.');
    }

    const questions = await this.questionRepository.findOnboardingByCategory(
      user.interestCategoryId,
      5,
    );
    return OnboardingQuestionsResponse.of(questions);
  }

  async submitAnswer(
    userId: string,
    request: OnboardingAnswerRequest,
  ): Promise<OnboardingAnswerResponse> {
    const user = await this.getUserOrThrow(userId);

    await this.userAnswerRepository.save(
      UserAnswer.onboarding(user.id, request.answerId),
    );

    if (request.followupAnswerId) {
      await this.userFollowupAnswerRepository.save(
        UserFollowupAnswer.onboarding(user.id, request.followupAnswerId),
      );
    }

    const answeredCount = await this.userAnswerRepository.countByUserId(
      user.id,
      true,
    );

    return OnboardingAnswerResponse.of(answeredCount);
  }

  // 보류
  // async getResult(userId: string):Promise<OnboardingResultResponse>{

  // }

  // 메서드
  private async getUserOrThrow(userId: string): Promise<User> {
    const user = await this.userRepository.findByUserId(userId);
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }
    return user;
  }
}
