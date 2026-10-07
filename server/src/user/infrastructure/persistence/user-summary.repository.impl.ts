import { Transactional } from 'typeorm-transactional';
import { User } from 'src/user/domain/model/user.entity';
import { generationQuota } from 'src/analysis/domain/generation-quota';
import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  UserSummary,
  UserSummaryInsight,
} from 'src/user/domain/model/user-summary.entity';
import { UserSummaryRepository } from 'src/user/domain/repository/user-summary.repository';
import { Repository } from 'typeorm';

@Injectable()
export class UserSummaryRepositoryImpl implements UserSummaryRepository {
  constructor(
    @InjectRepository(UserSummary)
    private readonly ormRepository: Repository<UserSummary>,
  ) {}

  @Transactional()
  async ensureSnapshot(
    userId: string,
    nearestId: string,
    fingerprint: string,
    accuracy: number,
  ): Promise<UserSummary> {
    await this.ormRepository.manager.getRepository(User).findOneOrFail({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    let summary = await this.findByUserId(userId);
    if (!summary || summary.sourceFingerprint !== fingerprint) {
      summary = Object.assign(summary ?? new UserSummary(), {
        userId,
        nearestPhilosopherId: nearestId,
        sourceFingerprint: fingerprint,
        accuracy,
        status: 'pending',
        generationToken: null,
        generationStartedAt: null,
        overallSummaries: [],
        contradictions: [],
      });
      await this.ormRepository.save(summary);
    }
    return summary;
  }

  @Transactional()
  async claim(
    userId: string,
    fingerprint: string,
    token: string,
    now: Date,
  ): Promise<boolean> {
    // Same lock as snapshot preparation: reserve quota and generation atomically.
    await this.ormRepository.manager.getRepository(User).findOneOrFail({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    const summary = await this.findByUserId(userId);
    if (
      !summary ||
      summary.sourceFingerprint !== fingerprint ||
      !(
        summary.status === 'pending' ||
        summary.status === 'failed' ||
        (summary.status === 'processing' &&
          summary.generationStartedAt &&
          summary.generationStartedAt.getTime() < now.getTime() - 60000)
      )
    )
      return false;
    const quota = generationQuota(summary, now);
    if (quota.remaining === 0)
      throw new HttpException(
        {
          code: 'ANALYSIS_DAILY_LIMIT',
          message:
            '오늘의 AI 분석 3회를 모두 사용했어요. 한국시간 자정에 다시 이용할 수 있어요.',
          quota,
        },
        429,
      );
    await this.ormRepository.update(
      { id: summary.id },
      {
        status: 'processing',
        generationToken: token,
        generationStartedAt: now,
        generationDate: quota.date,
        generationAttempts: quota.limit - quota.remaining + 1,
      },
    );
    return true;
  }

  async finish(
    userId: string,
    fingerprint: string,
    token: string,
    result: {
      overallSummaries: UserSummaryInsight[];
      contradictions: UserSummaryInsight[];
    } | null,
  ): Promise<boolean> {
    const update = await this.ormRepository.update(
      { userId, sourceFingerprint: fingerprint, generationToken: token },
      {
        status: result ? 'ready' : 'failed',
        generationToken: null,
        generationStartedAt: null,
        ...(result ?? {}),
      },
    );
    return update.affected === 1;
  }

  async findByUserId(userId: string): Promise<UserSummary | null> {
    return this.ormRepository.findOne({ where: { userId } });
  }
}
