import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { User } from 'src/user/domain/model/user.entity';
import { UserStatus } from 'src/user/domain/enum/user-status.enum';
import { OnboardingStatus } from 'src/user/domain/enum/OnboardingStatus.enum';
import {
  USER_REPOSITORY,
  type UserRepository,
} from 'src/user/domain/repository/user.repository';
import {
  USER_ANSWER_REPOSITORY,
  type UserAnswerRepository,
} from 'src/user-answer/domain/repository/user-answer.repository';
import {
  USER_FOLLOWUP_ANSWER_REPOSITORY,
  type UserFollowupAnswerRepository,
} from 'src/user-answer/domain/repository/user-followup-answer.repository';
import {
  QUESTION_REPOSITORY,
  type QuestionRepository,
} from 'src/question/domain/repository/question.repository';
import {
  USER_PHILOSOPHER_COUNT_REPOSITORY,
  type UserPhilosopherCountRepository,
} from 'src/philosopher/domain/repository/user-philosopher-count.repository';
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
} from 'src/category/domain/repository/category.repository';
import {
  ONBOARDING_SESSION_REPOSITORY,
  type OnboardingSessionRepository,
} from '../domain/repository/onboarding-session.repository';
import { OnboardingSession } from '../domain/model/onboarding-session.entity';
import { UserAnswer } from 'src/user-answer/domain/model/user-answer.entity';
import { UserFollowupAnswer } from 'src/user-answer/domain/model/user-followup-answer.entity';
import { QuestionType } from 'src/question/domain/enum/question-type.enum';
import { AnalysisService } from 'src/analysis/application/analysis.service';
import { DailyService } from 'src/daily/application/daily.service';
import { OnboardingTimeRequest } from '../presentation/dto/req/onboarding-time-request.dto';
import { OnboardingAnswerRequest } from '../presentation/dto/req/onboarding-answer-request.dto';
import { OnboardingCategoryRequest } from '../presentation/dto/req/onboarding-category-request.dto';
import { DailyTimeResponse } from '../presentation/dto/res/dailyTime-response.dto';
import { OnboardingStatusResponse } from '../presentation/dto/res/onboarding-status-response.dto';
import { OnboardingQuestionsResponse } from '../presentation/dto/res/onboarding-question-response.dto';
import { OnboardingAnswerResponse } from '../presentation/dto/res/onboarding-answer-response.dto';
import { OnboardingCategoryResponse } from '../presentation/dto/res/onboarding-category-response.dto';
import { OnboardingResultResponse } from '../presentation/dto/res/onboarding-result-response.dto';

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(USER_ANSWER_REPOSITORY)
    private readonly answers: UserAnswerRepository,
    @Inject(USER_FOLLOWUP_ANSWER_REPOSITORY)
    private readonly followups: UserFollowupAnswerRepository,
    @Inject(QUESTION_REPOSITORY) private readonly questions: QuestionRepository,
    @Inject(USER_PHILOSOPHER_COUNT_REPOSITORY)
    private readonly counts: UserPhilosopherCountRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
    @Inject(ONBOARDING_SESSION_REPOSITORY)
    private readonly sessions: OnboardingSessionRepository,
    private readonly analysis: AnalysisService,
    private readonly daily: DailyService,
  ) {}
  private async getUser(userId: string, lock = false): Promise<User> {
    const u = lock
      ? await this.sessions.lockUser(userId)
      : await this.users.findByUserId(userId);
    if (!u) throw new NotFoundException('유저를 찾을 수 없습니다.');
    if (u.userStatus !== UserStatus.ACTIVE)
      throw new ForbiddenException('서비스를 이용할 수 없는 계정입니다.');
    return u;
  }
  private requireIncomplete(user: User): void {
    if (user.onboardingStatus === OnboardingStatus.COMPLETE)
      throw new ConflictException({
        code: 'ONBOARDING_ALREADY_COMPLETE',
        message: '이미 온보딩을 완료했습니다.',
      });
  }
  private async requireSession(userId: string): Promise<OnboardingSession> {
    const s = await this.sessions.find(userId);
    if (!s)
      throw new ConflictException({
        code: 'ONBOARDING_NOT_STARTED',
        message: '관심 분야를 먼저 선택해주세요.',
      });
    return s;
  }
  @Transactional()
  async selectCategory(
    userId: string,
    request: OnboardingCategoryRequest,
  ): Promise<OnboardingCategoryResponse> {
    const user = await this.getUser(userId, true);
    this.requireIncomplete(user);
    const existing = await this.sessions.find(user.id);
    if (existing) {
      if (user.interestCategoryId === request.categoryId)
        return OnboardingCategoryResponse.of(user);
      throw new ConflictException({
        code: 'ONBOARDING_CATEGORY_LOCKED',
        message: '출제 후에는 관심 분야를 바꿀 수 없습니다.',
      });
    }
    if ((await this.answers.countByUserId(user.id, true)) > 0)
      throw new ConflictException({
        code: 'ONBOARDING_LEGACY_PROGRESS',
        message: '기존 온보딩 진행 데이터의 이전이 필요합니다.',
      });
    if (!(await this.categories.findById(request.categoryId)))
      throw new NotFoundException('관심 분야를 찾을 수 없습니다.');
    const questions = await this.questions.findOnboardingByCategory(
      request.categoryId,
      5,
    );
    if (
      questions.length !== 5 ||
      questions.some(
        (q) =>
          q.answers.length !== 2 ||
          (q.type === QuestionType.TWO_STAGE &&
            (!q.followupBody || q.followupAnswers.length !== 2)),
      )
    )
      throw new ConflictException({
        code: 'ONBOARDING_QUESTIONS_NOT_READY',
        message: '해당 분야의 질문을 준비 중이에요.',
      });
    const session = Object.assign(new OnboardingSession(), {
      userId: user.id,
      questionIds: questions.map((q) => q.id),
    });
    user.selectInterestCategory(request.categoryId);
    await this.users.save(user);
    await this.sessions.save(session);
    return OnboardingCategoryResponse.of(user);
  }
  async getOnboardingStatus(userId: string): Promise<OnboardingStatusResponse> {
    const user = await this.getUser(userId);
    const session = await this.sessions.find(user.id);
    return {
      ...OnboardingStatusResponse.of(user, session?.completedCount ?? 0),
      onboardingStatus: user.onboardingStatus,
      nextQuestionId: session?.questionIds[session.completedCount] ?? null,
      canViewResult: session?.completedCount === 5,
      resultRequested: session?.resultRequested ?? false,
      draftAnswerId: session?.draftAnswerId ?? null,
      nextStage: session?.draftAnswerId ? 2 : 1,
    };
  }
  async getOnboardingQuestions(
    userId: string,
  ): Promise<OnboardingQuestionsResponse> {
    const user = await this.getUser(userId);
    const session = await this.requireSession(user.id);
    const questions = await Promise.all(
      session.questionIds.map((id) => this.questions.findByIdWithAnswers(id)),
    );
    if (questions.some((q) => !q))
      throw new ConflictException({
        code: 'ONBOARDING_CONTENT_MISSING',
        message: '배정된 문제를 확인 중입니다.',
      });
    return {
      ...OnboardingQuestionsResponse.of(questions.filter((q) => q !== null)),
      nextQuestionIndex: session.completedCount,
      nextQuestionId: session.questionIds[session.completedCount] ?? null,
    };
  }
  @Transactional()
  async saveDraft(
    userId: string,
    request: { questionId: string; answerId: string },
  ): Promise<OnboardingStatusResponse> {
    const user = await this.getUser(userId, true);
    this.requireIncomplete(user);
    const session = await this.requireSession(user.id);
    if (session.questionIds[session.completedCount] !== request.questionId)
      throw new ConflictException({
        code: 'ONBOARDING_QUESTION_ORDER',
        message: '현재 미완료 문제부터 답해주세요.',
      });
    const question = await this.questions.findByIdWithAnswers(
      request.questionId,
      true,
    );
    if (
      !question ||
      question.type !== QuestionType.TWO_STAGE ||
      !question.answers.some((a) => a.id === request.answerId)
    )
      throw new BadRequestException(
        '2단 문제의 유효한 1단 선택지만 임시 저장할 수 있습니다.',
      );
    session.draftAnswerId = request.answerId;
    await this.sessions.save(session);
    return this.getOnboardingStatus(userId);
  }

  @Transactional()
  async submitAnswer(
    userId: string,
    request: OnboardingAnswerRequest,
  ): Promise<OnboardingAnswerResponse> {
    const user = await this.getUser(userId, true);
    this.requireIncomplete(user);
    const session = await this.requireSession(user.id);
    if (session.completedCount >= 5)
      throw new ConflictException({
        code: 'ONBOARDING_ANSWERS_COMPLETE',
        message: '5문제에 모두 답했습니다.',
      });
    if (session.questionIds[session.completedCount] !== request.questionId)
      throw new ConflictException({
        code: 'ONBOARDING_QUESTION_ORDER',
        message: '현재 미완료 문제부터 답해주세요.',
      });
    const question = await this.questions.findByIdWithAnswers(
      request.questionId,
      true,
    );
    if (!question)
      throw new ConflictException('배정된 문제를 찾을 수 없습니다.');
    const answer = question.answers.find((a) => a.id === request.answerId);
    if (!answer)
      throw new BadRequestException('해당 문제의 선택지가 아닙니다.');
    if (question.type === QuestionType.TWO_STAGE) {
      if (
        !request.followupAnswerId ||
        !question.followupAnswers.some((f) => f.id === request.followupAnswerId)
      )
        throw new BadRequestException({
          code: 'ONBOARDING_FOLLOWUP_REQUIRED',
          message: '해당 문제의 후속 답변까지 선택해주세요.',
        });
    } else if (request.followupAnswerId !== undefined) {
      throw new BadRequestException(
        '1단 문제에는 후속 답을 제출할 수 없습니다.',
      );
    }
    await this.answers.save(UserAnswer.onboarding(user.id, answer.id));
    await this.counts.increase(user.id, answer.philosopherId);
    if (request.followupAnswerId)
      await this.followups.save(
        UserFollowupAnswer.onboarding(user.id, request.followupAnswerId),
      );
    session.draftAnswerId = null;
    session.completedCount++;
    await this.sessions.save(session);
    return {
      ...OnboardingAnswerResponse.of(session.completedCount),
      canViewResult: session.completedCount === 5,
    };
  }
  @Transactional()
  async getResult(userId: string): Promise<OnboardingResultResponse> {
    const user = await this.getUser(userId, true);
    const session = await this.requireSession(user.id);
    if (session.completedCount !== 5)
      throw new ConflictException({
        code: 'ONBOARDING_INCOMPLETE',
        message: '5문제에 모두 답한 후 결과를 확인해주세요.',
      });
    // No external AI request inside this transaction; create a durable pending summary.
    const analysis = await this.analysis.getAnalysis(userId);
    const summary = await this.analysis.getContradiction(userId);
    session.resultRequested = true;
    await this.sessions.save(session);
    return { analysis, summary };
  }
  @Transactional()
  async registerDailyTime(
    userId: string,
    request: OnboardingTimeRequest,
  ): Promise<DailyTimeResponse> {
    const user = await this.getUser(userId, true);
    if (user.onboardingStatus === OnboardingStatus.COMPLETE)
      return DailyTimeResponse.from(user);
    const session = await this.requireSession(user.id);
    if (session.completedCount !== 5 || !session.resultRequested)
      throw new ConflictException({
        code: 'ONBOARDING_RESULT_REQUIRED',
        message: '5문제 풀이 후 결과를 먼저 확인해주세요.',
      });
    user.changeDailyTime(
      request.dailyQuestionTime ?? '08:00',
      request.timezone,
    );
    user.completeOnboarding();
    await this.users.save(user);
    await this.daily.assignFirstQuestion(userId);
    return DailyTimeResponse.from(user);
  }
}
