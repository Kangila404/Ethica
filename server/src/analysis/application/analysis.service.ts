import { generationQuota } from '../domain/generation-quota';
import { composeThoughts } from '../domain/composition';
import { Transactional } from 'typeorm-transactional';
import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import {
  ANALYSIS_AI_CLIENT,
  type AnalysisAiClient,
  type AnalysisAiResult,
} from '../domain/client/analysis-ai.client';
import {
  ANALYSIS_SOURCE_REPOSITORY,
  type AnalysisSourceRepository,
} from '../domain/repository/analysis-source.repository';
import AnalysisResponse from '../presentation/dto/res/analysis-response.dto';
import { ContradictionResponse } from '../presentation/dto/res/contradiction-response.dto';
import { Philosopher } from 'src/philosopher/domain/model/philosopher.entity';
import {
  USER_PHILOSOPHER_COUNT_REPOSITORY,
  type UserPhilosopherCountRepository,
} from 'src/philosopher/domain/repository/user-philosopher-count.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from 'src/user/domain/repository/user.repository';
import {
  USER_SUMMARY_REPOSITORY,
  type UserSummaryRepository,
} from 'src/user/domain/repository/user-summary.repository';
import { UserStatus } from 'src/user/domain/enum/user-status.enum';

export const ACCURACY_DESCRIPTION =
  '답변 30개를 기준으로 한 분석 참고도입니다. 통계적 정확도를 뜻하지 않으며, 답할수록 또렷해집니다.';
@Injectable()
export class AnalysisService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(USER_PHILOSOPHER_COUNT_REPOSITORY)
    private readonly counts: UserPhilosopherCountRepository,
    @Inject(USER_SUMMARY_REPOSITORY)
    private readonly summaries: UserSummaryRepository,
    @Inject(ANALYSIS_AI_CLIENT) private readonly ai: AnalysisAiClient,
    @Inject(ANALYSIS_SOURCE_REPOSITORY)
    private readonly source: AnalysisSourceRepository,
    @InjectRepository(Philosopher)
    private readonly philosophers: Repository<Philosopher>,
  ) {}
  private async snapshot(userId: string) {
    const user = await this.users.findByUserId(userId);
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');
    if (user.userStatus !== UserStatus.ACTIVE)
      throw new ForbiddenException('서비스를 이용할 수 없는 계정입니다.');
    const counts = (await this.counts.findByUserId(user.id)).filter(
      (c) => c.count > 0,
    );
    const philosophers = counts.length
      ? await this.philosophers.findBy({
          id: In(counts.map((c) => c.philosopherId)),
        })
      : [];
    if (philosophers.length !== counts.length)
      throw new ConflictException({
        code: 'ANALYSIS_CONTENT_MISSING',
        message: '분석에 필요한 사상가 정보를 확인 중입니다.',
      });
    const composition = composeThoughts(counts, philosophers);
    const contexts = await this.source.findContexts(user.id);
    const answeredCount = new Set(contexts.map((c) => c.questionId)).size;
    const response: AnalysisResponse = {
      nearestPhilosopher: composition[0]?.name ?? null,
      nearestPhilosopherId: composition[0]?.philosopherId ?? null,
      composition,
      answeredCount,
      accuracy: Math.min(100, Math.floor((answeredCount / 30) * 100)),
      accuracyDescription: ACCURACY_DESCRIPTION,
    };
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ composition, contexts }))
      .digest('hex');
    return { user, response, contexts, fingerprint };
  }
  @Transactional()
  async getAnalysis(userId: string): Promise<AnalysisResponse> {
    return (await this.snapshot(userId)).response;
  }
  @Transactional()
  async prepareSummary(userId: string) {
    await this.users.findByUserId(userId, true);
    const s = await this.snapshot(userId);
    const summary = s.response.nearestPhilosopherId
      ? await this.summaries.ensureSnapshot(
          s.user.id,
          s.response.nearestPhilosopherId,
          s.fingerprint,
          s.response.accuracy,
        )
      : null;
    return { s, summary };
  }
  async getContradiction(userId: string): Promise<ContradictionResponse> {
    const { s, summary } = await this.prepareSummary(userId);
    const status = summary?.status ?? 'pending';
    const quota = generationQuota(summary);
    const expired =
      status === 'processing' &&
      !!summary?.generationStartedAt &&
      Date.now() - summary.generationStartedAt.getTime() > 60000;
    return {
      nearestPhilosopherId: s.response.nearestPhilosopherId,
      nearestPhilosopherName: s.response.nearestPhilosopher,
      accuracy: s.response.accuracy,
      accuracyDescription: ACCURACY_DESCRIPTION,
      status,
      overallSummaries: summary?.overallSummaries ?? [],
      contradictions: summary?.contradictions ?? [],
      quota,
      canRetry:
        quota.remaining > 0 &&
        !!summary &&
        (status === 'pending' || status === 'failed' || expired),
      message:
        status === 'ready'
          ? null
          : status === 'failed'
            ? '요약을 만들지 못했어요. 다시 시도해주세요.'
            : status === 'processing'
              ? '요약을 만들고 있어요.'
              : '답변을 바탕으로 요약을 만들 수 있어요.',
    };
  }
  async analyzeContradiction(userId: string): Promise<ContradictionResponse> {
    const { s } = await this.prepareSummary(userId);
    if (!s.response.nearestPhilosopherId)
      throw new ConflictException({
        code: 'ANALYSIS_NO_ANSWERS',
        message: '먼저 문제에 답해주세요.',
      });
    const token = randomUUID();
    if (
      !(await this.summaries.claim(s.user.id, s.fingerprint, token, new Date()))
    )
      return this.getContradiction(userId);
    let result: AnalysisAiResult;
    try {
      result = await this.ai.analyze({
        answers: s.contexts.slice(-100).map((c) => JSON.stringify(c)),
        nearestPhilosopher: s.response.nearestPhilosopher!,
        philosopherComposition: s.response.composition.map(
          (c) => `${c.name}: ${c.percent}%`,
        ),
      });
      const allowedIds = new Set(
        s.contexts.slice(-100).map((c) => c.userAnswerId),
      );
      if (
        [...result.overallSummaries, ...result.contradictions].some(
          (item) =>
            !item.userAnswerIds.length ||
            item.userAnswerIds.some((id) => !allowedIds.has(id)),
        )
      )
        throw new Error('Invalid analysis evidence');
    } catch {
      await this.summaries.finish(s.user.id, s.fingerprint, token, null);
      return this.getContradiction(userId);
    }
    // The conditional write prevents an older request from replacing a newer snapshot.
    await this.summaries.finish(s.user.id, s.fingerprint, token, {
      overallSummaries: result.overallSummaries,
      contradictions: s.contexts.some((c) => c.followupAnswer)
        ? result.contradictions
        : [],
    });
    return this.getContradiction(userId);
  }
}
