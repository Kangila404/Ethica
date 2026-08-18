import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ANALYSIS_AI_CLIENT,
  type AnalysisAiClient,
} from 'src/analysis/domain/client/analysis-ai.client';
import AnaisysResponse from 'src/analysis/presentation/dto/res/analysis-response.dto';
import { ContradictionResponse } from 'src/analysis/presentation/dto/res/contradiction-response.dto';
import { Philosopher } from 'src/philosopher/domain/model/philosopher.entity';
import {
  USER_PHILOSOPHER_COUNT_REPOSITORY,
  type UserPhilosopherCountRepository,
} from 'src/philosopher/domain/repository/user-philosopher-count.repository';
import {
  FOLLOWUP_ANSWER_REPOSITORY,
  type FollowupAnswerRepository,
} from 'src/question/domain/repository/followup-answer.repository';
import {
  USER_FOLLOWUP_ANSWER_REPOSITORY,
  type UserFollowupAnswerRepository,
} from 'src/user-answer/domain/repository/user-followup-answer.repository';
import { UserStatus } from 'src/user/domain/enum/user-status.enum';
import { User } from 'src/user/domain/model/user.entity';
import type { UserRepository } from 'src/user/domain/repository/user.repository';
import { USER_REPOSITORY } from 'src/user/domain/repository/user.repository';
import {
  USER_SUMMARY_REPOSITORY,
  type UserSummaryRepository,
} from 'src/user/domain/repository/user-summary.repository';
import { In, Repository } from 'typeorm';

type PhilosopherComposition = {
  philosopher: Philosopher;
  percent: number;
};

@Injectable()
export class AnalysisService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(USER_PHILOSOPHER_COUNT_REPOSITORY)
    private readonly userPhilosopherCountRepository: UserPhilosopherCountRepository,
    @Inject(USER_FOLLOWUP_ANSWER_REPOSITORY)
    private readonly userFollowupAnswerRepository: UserFollowupAnswerRepository,
    @Inject(FOLLOWUP_ANSWER_REPOSITORY)
    private readonly followupAnswerRepository: FollowupAnswerRepository,
    @Inject(USER_SUMMARY_REPOSITORY)
    private readonly userSummaryRepository: UserSummaryRepository,
    @Inject(ANALYSIS_AI_CLIENT)
    private readonly analysisAiClient: AnalysisAiClient,
    @InjectRepository(Philosopher)
    private readonly philosopherRepository: Repository<Philosopher>,
  ) {}

  async getAnalysis(userId: string): Promise<AnaisysResponse> {
    const user = await this.findActiveUserByUserIdOrThrow(userId);
    const composition = await this.getPhilosopherComposition(user.id);
    const nearestPhilosopher = composition[0]?.philosopher.name;

    if (!nearestPhilosopher) {
      throw new NotFoundException('분석 결과 철학자 정보를 찾을 수 없습니다.');
    }

    return AnaisysResponse.of(
      nearestPhilosopher,
      composition,
      composition[0].percent,
    );
  }

  async getContradiction(userId: string): Promise<ContradictionResponse> {
    const user = await this.findActiveUserByUserIdOrThrow(userId);
    const summary = await this.userSummaryRepository.findByUserId(user.id);

    if (!summary) {
      throw new NotFoundException('저장된 분석 결과가 없습니다.');
    }

    const nearestPhilosopher = await this.findPhilosopherByIdOrThrow(
      summary.nearestPhilosopherId,
    );

    return ContradictionResponse.from(summary, nearestPhilosopher);
  }

  async analyzeContradiction(userId: string): Promise<ContradictionResponse> {
    const user = await this.findActiveUserByUserIdOrThrow(userId);
    const composition = await this.getPhilosopherComposition(user.id);
    const nearest = composition[0]?.philosopher;

    if (!nearest) {
      throw new NotFoundException('분석 결과 철학자 정보를 찾을 수 없습니다.');
    }

    const followupAnswerBodies = await this.getFollowupAnswerBodies(user.id);
    const aiResult = await this.analysisAiClient.analyze({
      answers: followupAnswerBodies,
      nearestPhilosopher: nearest.name,
      philosopherComposition: composition
        .map((item) => `${item.philosopher.name}: ${item.percent}%`)
        .slice(0, 3),
    });

    await this.userSummaryRepository.upsertAnalysis(
      user.id,
      nearest.id,
      aiResult.overallSummaries,
      aiResult.contradictions,
      aiResult.accuracy,
    );

    return ContradictionResponse.of(
      nearest,
      aiResult.overallSummaries,
      aiResult.contradictions,
      aiResult.accuracy,
    );
  }

  private async getPhilosopherComposition(
    userId: string,
  ): Promise<PhilosopherComposition[]> {
    const philosopherCounts =
      await this.userPhilosopherCountRepository.findByUserId(userId);
    if (philosopherCounts.length === 0) {
      throw new NotFoundException('분석할 답변이 없습니다.');
    }

    const philosophers = await this.findPhilosophersByIds([
      ...new Set(philosopherCounts.map((count) => count.philosopherId)),
    ]);
    if (philosophers.length === 0) {
      throw new NotFoundException('분석할 철학자 정보를 찾을 수 없습니다.');
    }

    const totalCount = philosopherCounts.reduce(
      (sum, count) => sum + count.count,
      0,
    );
    const countByPhilosopherId = new Map(
      philosopherCounts.map((count) => [count.philosopherId, count.count]),
    );

    return philosophers
      .map((philosopher) => ({
        philosopher,
        percent: this.calculatePercent(
          countByPhilosopherId.get(philosopher.id) ?? 0,
          totalCount,
        ),
      }))
      .sort((a, b) => b.percent - a.percent);
  }

  private async getFollowupAnswerBodies(userId: string): Promise<string[]> {
    const userFollowupAnswers =
      await this.userFollowupAnswerRepository.findAllByUserId(userId);

    if (userFollowupAnswers.length === 0) {
      throw new NotFoundException('분석할 후속 답변이 없습니다.');
    }

    const followupAnswerIds = userFollowupAnswers.map(
      (answer) => answer.followupAnswerId,
    );
    const followupAnswers =
      await this.followupAnswerRepository.findByIds(followupAnswerIds);

    if (followupAnswers.length === 0) {
      throw new NotFoundException('후속 답변 정보를 찾을 수 없습니다.');
    }

    const followupAnswerById = new Map(
      followupAnswers.map((answer) => [answer.id, answer]),
    );

    return userFollowupAnswers.slice(-6).map((userFollowupAnswer) => {
      const followupAnswer = followupAnswerById.get(
        userFollowupAnswer.followupAnswerId,
      );

      if (!followupAnswer) {
        throw new NotFoundException('?꾩냽 ?듬? ?뺣낫瑜?李얠쓣 ???놁뒿?덈떎.');
      }

      return followupAnswer.body;
    });
  }

  async findUserByUserIdOrThrow(userId: string): Promise<User> {
    const user = await this.userRepository.findByUserId(userId);
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }
    return user;
  }

  private async findActiveUserByUserIdOrThrow(userId: string): Promise<User> {
    const user = await this.findUserByUserIdOrThrow(userId);
    this.validationUserStatus(user.userStatus);
    return user;
  }

  private async findPhilosophersByIds(ids: string[]): Promise<Philosopher[]> {
    return this.philosopherRepository.find({
      where: { id: In(ids) },
    });
  }

  private async findPhilosopherByIdOrThrow(id: string): Promise<Philosopher> {
    const philosopher = await this.philosopherRepository.findOne({
      where: { id },
    });

    if (!philosopher) {
      throw new NotFoundException('철학자 정보를 찾을 수 없습니다.');
    }

    return philosopher;
  }

  validationUserStatus(userStatus: UserStatus): void {
    if (userStatus !== UserStatus.ACTIVE) {
      throw new ForbiddenException('정지된 계정입니다.');
    }
  }

  private calculatePercent(score: number, total: number): number {
    if (total === 0) {
      return 0;
    }

    return Math.round((score / total) * 1000) / 10;
  }
}
