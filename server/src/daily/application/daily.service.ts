import {
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
import { Question } from 'src/question/domain/model/question.entity';
import { Answer } from 'src/question/domain/model/answer.entity';
import { DailyQuestionStatus } from '../domain/enums/daily-question-status.enum';
import { UserAnswer } from 'src/user-answer/domain/model/user-answer.entity';
import { SubmitStageTwoRequest } from '../presentation/dto/req/submit-stage-Two-request.dto';
import { SubmitStageTwoResponse } from '../presentation/dto/res/submit-stage-two-response.dto';
import { FollowupAnswer } from 'src/question/domain/model/followup-answer.entity';
import type { FollowupAnswerRepository } from 'src/question/domain/repository/followup-answer.repository';
import { FOLLOWUP_ANSWER_REPOSITORY } from 'src/question/domain/repository/followup-answer.repository';
import type { UserFollowupAnswerRepository } from 'src/user-answer/domain/repository/user-followup-answer.repository';
import { USER_FOLLOWUP_ANSWER_REPOSITORY } from 'src/user-answer/domain/repository/user-followup-answer.repository';
import { UserFollowupAnswer } from 'src/user-answer/domain/model/user-followup-answer.entity';

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
  ) {}

  async getDaily(userId: string): Promise<DailyQuestionResponse> {
    const user = await this.findUserByUserIdOrThrow(userId);
    this.validationUserStatus(user.userStatus);

    const today = this.getTodayString();
    const userDailyQuestion =
      await this.userDailyQuestionRepository.findByUserIdAndServiceDate(
        user.id,
        today,
      );
    if (!userDailyQuestion) {
      throw new NotFoundException('오늘의 질문을 찾을 수 없습니다.');
    }

    const question = await this.questionRepository.findByIdWithAnswers(
      userDailyQuestion.questionId,
    );
    if (!question) {
      throw new NotFoundException('질문 원본을 찾을 수 없습니다.');
    }

    return DailyQuestionResponse.of(question, userDailyQuestion.status);
  }

  async assignForToday(userId: string): Promise<void> {
    const user = await this.findUserByUserIdOrThrow(userId);
    const today = this.getTodayString();

    // 1. 멱등 가드
    const existing =
      await this.userDailyQuestionRepository.findByUserIdAndServiceDate(
        user.id,
        today,
      );
    if (existing) return;

    // 2. 안 받은 daily 문제 하나
    const servedIds =
      await this.userDailyQuestionRepository.findServicedQuestionIds(user.id);
    const question =
      await this.questionRepository.findRandomDailyExcluding(servedIds);
    if (!question) return; // 낼 문제 없음 → 스킵

    // 3. 저장
    const udq = new UserDailyQuestion();
    udq.userId = user.id;
    udq.questionId = question.id;
    udq.serviceDate = today;

    try {
      await this.userDailyQuestionRepository.save(udq);
    } catch (e: unknown) {
      if (this.isDuplicateEntryError(e)) return;
      throw e;
    }
  }

  async submitStageTwo(
    userId: string,
    request: SubmitStageTwoRequest,
  ): Promise<SubmitStageTwoResponse> {
    const user = await this.findUserByUserIdOrThrow(userId);
    this.validationUserStatus(user.userStatus);
    const followupAnswer = await this.findFollowupAnswerByIdOrThrow(
      request.followupAnswerId,
    );
    const userFollowupAnswer = UserFollowupAnswer.createUserFollowupAnswer(
      user.id,
      followupAnswer.id,
    );
    await this.userFollowupAnswerRepository.save(userFollowupAnswer);
    return SubmitStageTwoResponse.from(followupAnswer);
  }

  async submitStageOne(
    userId: string,
    request: SubmitStageOneRequest,
  ): Promise<SubmitStageOneResponse> {
    const user = await this.findUserByUserIdOrThrow(userId);
    const today = this.getTodayString();
    // 오늘의 문제
    const dailyQuestion =
      await this.userDailyQuestionRepository.findByUserIdAndServiceDate(
        user.id,
        today,
      );
    // 제출된 문제
    if (dailyQuestion?.questionId !== request.questionId) {
      throw new ForbiddenException('제출한 문제와 오늘의 문제가 다릅니다.');
    }

    // 이미 푼 문제인지 확인
    this.validationSubmittedAnswer(dailyQuestion.status);

    const question = await this.findQuestionByIdOrThrow(
      dailyQuestion.questionId,
    );
    const answer = await this.findAnswerByIdOrThrow(request.answerId);

    if (answer.questionId !== question.id) {
      throw new ForbiddenException('해당 문제의 선택지가 아닙니다.');
    }

    // 유저 대답 생성
    const userAnswer = UserAnswer.createUserStageOneAnswer(
      user.id,
      request.answerId,
    );

    await this.userAnswerRepository.save(userAnswer);

    dailyQuestion.complete();
    await this.userDailyQuestionRepository.save(dailyQuestion);

    return SubmitStageOneResponse.from();
  }

  // ============ 메서드 ============ //
  async findUserByUserIdOrThrow(userId: string): Promise<User> {
    const user = await this.userRepository.findByUserId(userId);
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }
    return user;
  }

  async findQuestionByIdOrThrow(questionId: string): Promise<Question> {
    const question = await this.questionRepository.findById(questionId);
    if (!question) {
      throw new NotFoundException('문제를 찾을 수 없습니다.');
    }
    return question;
  }

  async findAnswerByIdOrThrow(answerId: string): Promise<Answer> {
    const answer = await this.answerRepository.findById(answerId);
    if (!answer) {
      throw new NotFoundException('선택지를 찾을 수 없습니다.');
    }
    return answer;
  }

  async findFollowupAnswerByIdOrThrow(
    followupAnswerId: string,
  ): Promise<FollowupAnswer> {
    const followupAnswer =
      await this.followupAnswerRepository.findById(followupAnswerId);
    if (!followupAnswer) {
      throw new NotFoundException('2중 질문을 찾을 수 없습니다.');
    }
    return followupAnswer;
  }

  private getTodayString(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  }

  // 검증 메서드
  validationUserStatus(userStatus: UserStatus): void {
    if (userStatus !== UserStatus.ACTIVE) {
      throw new ForbiddenException('정지된 계정입니다.');
    }
  }

  validationSubmittedAnswer(dailyQuestionStatus: DailyQuestionStatus): void {
    if (dailyQuestionStatus !== DailyQuestionStatus.PENDING) {
      throw new ForbiddenException('이미 푼 문제입니다.');
    }
  }

  private isDuplicateEntryError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'ER_DUP_ENTRY'
    );
  }
}
