import { Transactional } from 'typeorm-transactional';
import { User } from 'src/user/domain/model/user.entity';
import { Injectable } from '@nestjs/common';
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

  async claim(
    userId: string,
    fingerprint: string,
    token: string,
    now: Date,
  ): Promise<boolean> {
    const result = await this.ormRepository
      .createQueryBuilder()
      .update()
      .set({
        status: 'processing',
        generationToken: token,
        generationStartedAt: now,
      })
      .where('user_id = :userId', { userId })
      .andWhere('sourceFingerprint = :fingerprint', { fingerprint })
      .andWhere(
        "(status IN ('pending','failed') OR (status = 'processing' AND generationStartedAt < :expired))",
        { expired: new Date(now.getTime() - 60000) },
      )
      .execute();
    return result.affected === 1;
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
