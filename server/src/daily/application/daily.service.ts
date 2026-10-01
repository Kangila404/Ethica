import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ANSWER_REPOSITORY } from 'src/question/domain/repository/answer.repository';
import type { AnswerRepository } from 'src/question/domain/repository/answer.repository';
import { QUESTION_REPOSITORY } from 'src/question/domain/repository/question.repository';
import type { QuestionRepository } from 'src/question/domain/repository/question.repository';
import { USER_REPOSITORY } from 'src/user/domain/repository/user.repository';
import type { UserRepository } from 'src/user/domain/repository/user.repository';
import { USER_DAILY_QUESTION_REPOSITORY } from '../domain/repository/user-daily-question.repository';
import type { UserDailyQuestionRepository } from '../domain/repository/user-daily-question.repository';
import { User } from 'src/user/domain/model/user.entity';
import { UserStatus } from 'src/user/domain/enum/user-status.enum';
import { UserDailyQuestion } from '../domain/model/user_daily_question.entity';
import DailyQuestionResponse from '../presentation/dto/res/daily-question-response.dto';
import { SubmitStageOneRequest } from '../presentation/dto/req/submit-stage-One-request.dto';
import { SubmitStageOneResponse } from '../presentation/dto/res/submit-stage-one-response.dto';
import { USER_ANSWER_REPOSITORY } from 'src/user-answer/domain/repository/user-answer.repository';
import type { UserAnswerRepository } from 'src/user-answer/domain/repository/user-answer.repository';
import { DailyQuestionStatus } from '../domain/enums/daily-question-status.enum';
import { UserAnswer } from 'src/user-answer/domain/model/user-answer.entity';
import { SubmitStageTwoRequest } from '../presentation/dto/req/submit-stage-Two-request.dto';
import { SubmitStageTwoResponse } from '../presentation/dto/res/submit-stage-two-response.dto';
import type { FollowupAnswerRepository } from 'src/question/domain/repository/followup-answer.repository';
import { FOLLOWUP_ANSWER_REPOSITORY } from 'src/question/domain/repository/followup-answer.repository';
import type { UserFollowupAnswerRepository } from 'src/user-answer/domain/repository/user-followup-answer.repository';
import { USER_FOLLOWUP_ANSWER_REPOSITORY } from 'src/user-answer/domain/repository/user-followup-answer.repository';
import { UserFollowupAnswer } from 'src/user-answer/domain/model/user-followup-answer.entity';
import {
  USER_PHILOSOPHER_COUNT_REPOSITORY,
  type UserPhilosopherCountRepository,
} from 'src/philosopher/domain/repository/user-philosopher-count.repository';
import { randomUUID } from 'node:crypto';
import {
  dailyBoundary,
  dailyDate,
  nextDailyBoundary,
} from 'src/common/daily-clock';
import { QuestionType } from 'src/question/domain/enum/question-type.enum';
import { OnboardingStatus } from 'src/user/domain/enum/OnboardingStatus.enum';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class DailyService {
  constructor(
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
    @Inject(ANSWER_REPOSITORY)
    private readonly answerRepository: AnswerRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(USER_DAILY_QUESTION_REPOSITORY)
    private readonly userDailyQuestionRepository: UserDailyQuestionRepository,
    @Inject(USER_ANSWER_REPOSITORY)
    private readonly userAnswerRepository: UserAnswerRepository,
    @Inject(FOLLOWUP_ANSWER_REPOSITORY)
    private readonly followupAnswerRepository: FollowupAnswerRepository,
    @Inject(USER_FOLLOWUP_ANSWER_REPOSITORY)
    private readonly userFollowupAnswerRepository: UserFollowupAnswerRepository,
    @Inject(USER_PHILOSOPHER_COUNT_REPOSITORY)
    private readonly userPhilosopherCountRepository: UserPhilosopherCountRepository,
  ) {}

  @Transactional()
  async getDaily(userId: string) {
    const user = await this.lockUser(userId);
    const cycle = await this.ensureCycle(user);
    if (!cycle)
      return { userDailyQuestion: 'waiting', nextDailyAt: user.nextDailyAt };
    if (!cycle.questionId)
      return {
        userDailyQuestion: 'preparing',
        message: '새 질문을 준비 중이에요',
        nextDailyAt: user.nextDailyAt,
        serviceDate: cycle.serviceDate,
      };
    const question = await this.questionRepository.findByIdWithAnswers(
      cycle.questionId,
    );
    if (!question) throw new NotFoundException('질문 원본을 찾을 수 없습니다.');
    const selected = question.answers.find(
      (answer) => answer.id === cycle.answerId,
    );
    const selectedFollowup = question.followupAnswers.find(
      (answer) => answer.id === cycle.followupAnswerId,
    );
    return {
      ...DailyQuestionResponse.of(question, cycle.status),
      questionId: question.id,
      type: question.type,
      cycleId: cycle.id,
      serviceDate: cycle.serviceDate,
      nextDailyAt: user.nextDailyAt,
      selectedAnswer: selected
        ? {
            id: selected.id,
            explanation: selected.explanation,
            philosopherId: selected.philosopherId,
          }
        : null,
      selectedFollowupAnswer: selectedFollowup
        ? { id: selectedFollowup.id, explanation: selectedFollowup.explanation }
        : null,
      selectedAnswerId: cycle.answerId,
      selectedFollowupAnswerId: cycle.followupAnswerId,
      requiresFollowup:
        question.type === QuestionType.TWO_STAGE &&
        cycle.status === DailyQuestionStatus.PENDING &&
        !!cycle.answerId,
      followupAnswers: cycle.answerId
        ? question.followupAnswers.map(({ id, body }) => ({ id, body }))
        : [],
    };
  }

  @Transactional()
  async assignForToday(userId: string): Promise<void> {
    await this.ensureCycle(await this.lockUser(userId));
  }

  @Transactional()
  async submitStageOne(
    userId: string,
    request: SubmitStageOneRequest,
  ): Promise<SubmitStageOneResponse> {
    const user = await this.lockUser(userId);
    const cycle = await this.ensureCycle(user);
    if (!cycle || cycle.questionId !== request.questionId) {
      throw new ForbiddenException('현재 출제된 문제가 아닙니다.');
    }
    const question = await this.questionRepository.findById(
      request.questionId,
      true,
    );
    if (!question) throw new NotFoundException('문제를 찾을 수 없습니다.');
    const answer = await this.answerRepository.findById(request.answerId, true);
    if (!answer || answer.questionId !== cycle.questionId)
      throw new ForbiddenException('해당 문제의 선택지가 아닙니다.');
    if (cycle.answerId) {
      if (cycle.answerId !== answer.id)
        throw new ConflictException('이미 선택한 답변은 변경할 수 없습니다.');
      return SubmitStageOneResponse.from(
        question.type === QuestionType.TWO_STAGE &&
          cycle.status === DailyQuestionStatus.PENDING,
        answer.explanation,
        answer.philosopherId,
        cycle.status === DailyQuestionStatus.COMPLETED,
      );
    }
    if (cycle.status !== DailyQuestionStatus.PENDING)
      throw new ConflictException('이미 답변한 문제입니다.');
    cycle.answerId = answer.id;
    if (question.type !== QuestionType.TWO_STAGE) {
      const result = UserAnswer.createUserStageOneAnswer(user.id, answer.id);
      result.serviceDate = cycle.serviceDate;
      await this.userAnswerRepository.save(result);
      await this.userPhilosopherCountRepository.increase(
        user.id,
        answer.philosopherId,
      );
      cycle.complete();
    }
    // For two-stage questions, answerId is a draft until the followup is submitted.
    await this.userDailyQuestionRepository.save(cycle);
    return SubmitStageOneResponse.from(
      question.type === QuestionType.TWO_STAGE,
      answer.explanation,
      answer.philosopherId,
      question.type !== QuestionType.TWO_STAGE,
    );
  }

  @Transactional()
  async submitStageTwo(
    userId: string,
    request: SubmitStageTwoRequest,
  ): Promise<SubmitStageTwoResponse> {
    const user = await this.lockUser(userId);
    const cycle = await this.ensureCycle(user);
    if (
      !cycle ||
      cycle.questionId !== request.questionId ||
      !cycle.answerId ||
      ![DailyQuestionStatus.PENDING, DailyQuestionStatus.COMPLETED].includes(
        cycle.status,
      )
    ) {
      throw new ForbiddenException(
        '현재 문제의 1단 답변을 먼저 제출해야 합니다.',
      );
    }
    const question = await this.questionRepository.findById(
      request.questionId,
      true,
    );
    const answer = await this.followupAnswerRepository.findById(
      request.followupAnswerId,
      true,
    );
    if (
      question?.type !== QuestionType.TWO_STAGE ||
      !answer ||
      answer.questionId !== cycle.questionId
    ) {
      throw new ForbiddenException('해당 문제의 후속 선택지가 아닙니다.');
    }
    if (cycle.followupAnswerId) {
      if (cycle.followupAnswerId !== answer.id)
        throw new ConflictException('이미 답변한 후속 질문입니다.');
      return SubmitStageTwoResponse.from(answer);
    }
    if (cycle.status === DailyQuestionStatus.PENDING) {
      const first = await this.answerRepository.findById(cycle.answerId, true);
      if (!first || first.questionId !== cycle.questionId)
        throw new ConflictException('저장한 첫 선택을 확인할 수 없습니다.');
      const result = UserAnswer.createUserStageOneAnswer(user.id, first.id);
      result.serviceDate = cycle.serviceDate;
      await this.userAnswerRepository.save(result);
      await this.userPhilosopherCountRepository.increase(
        user.id,
        first.philosopherId,
      );
    }
    // Legacy completed cycles were already counted; never aggregate those twice.
    await this.userFollowupAnswerRepository.save(
      UserFollowupAnswer.createUserFollowupAnswer(user.id, answer.id),
    );
    cycle.followupAnswerId = answer.id;
    cycle.complete();
    await this.userDailyQuestionRepository.save(cycle);
    return SubmitStageTwoResponse.from(answer);
  }

  /** Called under the user row lock, including scheduler and HTTP paths. */
  private async ensureCycle(user: User): Promise<UserDailyQuestion | null> {
    const now = new Date();
    let latest = await this.userDailyQuestionRepository.findLatest(user.id);
    if (user.dailyScheduleEffectiveAt && user.dailyScheduleEffectiveAt <= now) {
      user.dailyQuestionTime = user.pendingDailyQuestionTime!;
      user.timezone = user.pendingTimezone!;
      user.nextDailyAt = user.dailyScheduleEffectiveAt;
      user.dailyScheduleEffectiveAt = null;
      user.pendingDailyQuestionTime = null;
      user.pendingTimezone = null;
    }
    const time = user.dailyQuestionTime || '08:00';
    const zone = user.timezone || 'Asia/Seoul';
    if (user.nextDailyAt && user.nextDailyAt > now) return latest;
    if (
      !user.nextDailyAt &&
      latest &&
      latest.serviceDate >= dailyDate(now, zone)
    ) {
      user.nextDailyAt =
        user.dailyScheduleEffectiveAt ?? dailyBoundary(now, time, zone, true);
      await this.userRepository.save(user);
      return latest;
    }
    if (latest?.status === DailyQuestionStatus.PENDING) {
      latest.status = DailyQuestionStatus.EXPIRED;
      await this.userDailyQuestionRepository.save(latest);
    }
    const served =
      await this.userDailyQuestionRepository.findServicedQuestionIds(user.id);
    const question =
      await this.questionRepository.findRandomDailyExcluding(served);
    latest = new UserDailyQuestion();
    latest.userId = user.id;
    latest.questionId = question?.id ?? null;
    latest.openedAt = dailyBoundary(now, time, zone);
    latest.serviceDate = dailyDate(latest.openedAt, zone);
    latest.status = question
      ? DailyQuestionStatus.PENDING
      : DailyQuestionStatus.PREPARING;
    latest.notificationStatus =
      question && user.notificationEnabled && user.fcmToken
        ? 'pending'
        : 'skipped';
    await this.userDailyQuestionRepository.save(latest);
    user.nextDailyAt =
      user.dailyScheduleEffectiveAt ?? nextDailyBoundary(now, time, zone);
    await this.userRepository.save(user);
    return latest;
  }

  @Transactional()
  async claimNotification(userId: string) {
    const user = await this.lockUser(userId);
    const cycle = await this.ensureCycle(user);
    if (
      !cycle ||
      cycle.status !== DailyQuestionStatus.PENDING ||
      ['sent', 'skipped'].includes(cycle.notificationStatus) ||
      cycle.notificationAttempts >= 3
    )
      return null;
    if (!user.notificationEnabled || !user.fcmToken) {
      cycle.notificationStatus = 'skipped';
      await this.userDailyQuestionRepository.save(cycle);
      return null;
    }
    if (
      cycle.notificationAttemptAt &&
      Date.now() - cycle.notificationAttemptAt.getTime() < 120_000
    )
      return null;
    cycle.notificationStatus = 'sending';
    cycle.notificationToken = randomUUID();
    cycle.notificationAttemptAt = new Date();
    cycle.notificationAttempts += 1;
    await this.userDailyQuestionRepository.save(cycle);
    const question = await this.questionRepository.findById(cycle.questionId!);
    if (!question) throw new NotFoundException('질문 원본을 찾을 수 없습니다.');
    return {
      user,
      cycleId: cycle.id,
      token: cycle.notificationToken,
      questionBody: question.stage1Body,
    };
  }

  @Transactional()
  async finishNotification(
    userId: string,
    cycleId: string,
    token: string,
    outcome: 'sent' | 'pending' | 'skipped',
  ) {
    const user = await this.userRepository.findByUserId(userId, true);
    if (!user) return;
    const cycle = await this.userDailyQuestionRepository.findLatest(user.id);
    if (!cycle || cycle.id !== cycleId || cycle.notificationToken !== token)
      return;
    cycle.notificationStatus = outcome;
    cycle.notificationToken = null;
    await this.userDailyQuestionRepository.save(cycle);
  }

  private async lockUser(userId: string): Promise<User> {
    const user = await this.userRepository.findByUserId(userId, true);
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');
    if (
      user.userStatus !== UserStatus.ACTIVE ||
      user.onboardingStatus !== OnboardingStatus.COMPLETE
    ) {
      throw new ForbiddenException(
        '온보딩을 완료한 활성 계정만 이용할 수 있습니다.',
      );
    }
    return user;
  }
}
