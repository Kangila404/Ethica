import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MoreThan, In } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { randomUUID } from 'node:crypto';
import { User } from 'src/user/domain/model/user.entity';
import { UserStatus } from 'src/user/domain/enum/user-status.enum';
import { AuthIdentity } from 'src/auth/domain/model/auth-identity.entity';
import { AuthChallenge } from 'src/auth/domain/model/auth-challenge.entity';
import { RefreshToken } from 'src/auth/domain/model/refresh-token.entity';
import { UserAnswer } from 'src/user-answer/domain/model/user-answer.entity';
import { UserFollowupAnswer } from 'src/user-answer/domain/model/user-followup-answer.entity';
import { UserSummary } from 'src/user/domain/model/user-summary.entity';
import { UserPhilosopherCount } from 'src/philosopher/domain/model/user-philosopher-count.entity';
import { UserDailyQuestion } from 'src/daily/domain/model/user_daily_question.entity';
import { OnboardingSession } from 'src/onboarding/domain/model/onboarding-session.entity';
import { Inquiry } from 'src/support/domain/model/inquiry.entity';
import { Notice } from 'src/support/domain/model/notice.entity';
import { RevocationJob } from '../domain/model/revocation-job.entity';
import type { AccountStore } from '../domain/account-store';
@Injectable()
export class SqlAccountStore implements AccountStore {
  constructor(@InjectDataSource() private readonly db: DataSource) {}
  async identity(userId: string) {
    const user = await this.db.getRepository(User).findOneBy({ userId });
    if (!user || user.userStatus !== UserStatus.ACTIVE)
      throw new UnauthorizedException();
    const identity = await this.db
      .getRepository(AuthIdentity)
      .findOneBy({ userId: user.id });
    if (!identity) throw new NotFoundException('연결된 소셜 계정이 없습니다.');
    return identity;
  }
  @Transactional()
  async withdraw(
    userId: string,
    identityId: string,
    challengeId: string,
    encryptedCredential: string,
  ) {
    const users = this.db.getRepository(User);
    const user = await users.findOne({
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user || user.userStatus !== UserStatus.ACTIVE)
      throw new UnauthorizedException();
    if (
      !(await this.db
        .getRepository(AuthIdentity)
        .existsBy({ id: identityId, userId: user.id }))
    )
      throw new UnauthorizedException();
    const used = await this.db
      .getRepository(AuthChallenge)
      .delete({ id: challengeId, expiresAt: MoreThan(new Date()) });
    if (used.affected !== 1)
      throw new UnauthorizedException('재인증 요청이 만료됐거나 사용됐습니다.');
    await this.db.getRepository(RevocationJob).save({
      userId: user.id,
      encryptedCredential,
      nextAttemptAt: new Date(),
    });
    user.withdraw();
    user.fcmToken = null;
    user.nextDailyAt = null;
    user.pendingDailyQuestionTime = null;
    user.pendingTimezone = null;
    user.dailyScheduleEffectiveAt = null;
    await users.save(user);
    await users.softRemove(user);
    await this.db.getRepository(RefreshToken).delete({ userId: user.id });
  }
  @Transactional()
  async claim(now: Date) {
    const repo = this.db.getRepository(RevocationJob);
    const job = await repo
      .createQueryBuilder('job')
      .addSelect('job.encryptedCredential')
      .where('job.status IN (:...statuses)', {
        statuses: ['pending', 'processing'],
      })
      .andWhere('job.nextAttemptAt <= :now', { now: now.getTime() })
      .orderBy('job.id', 'ASC')
      .take(1)
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .getOne();
    if (!job) return null;
    if (job.attempts >= 10) {
      job.status = 'failed';
      job.leaseToken = null;
      job.lastErrorCode = 'SOCIAL_REVOCATION_FAILED';
      await repo.save(job);
      return null;
    }
    job.status = 'processing';
    job.attempts++;
    job.leaseToken = randomUUID();
    job.nextAttemptAt = new Date(now.getTime() + 120000);
    await repo.save(job);
    return job;
  }
  @Transactional()
  async finish(id: string, token: string, success: boolean, now: Date) {
    const repo = this.db.getRepository(RevocationJob);
    const job = await repo.findOne({
      where: { id, leaseToken: token },
      lock: { mode: 'pessimistic_write' },
    });
    if (!job) return;
    job.status = success ? 'done' : job.attempts >= 10 ? 'failed' : 'pending';
    job.lastErrorCode = success ? null : 'SOCIAL_REVOCATION_FAILED';
    job.leaseToken = null;
    job.nextAttemptAt = new Date(
      now.getTime() +
        Math.min(86400000, 60000 * 2 ** Math.min(job.attempts, 10)),
    );
    if (success) job.encryptedCredential = null;
    await repo.save(job);
  }
  async jobs(after?: string) {
    return this.db.getRepository(RevocationJob).find({
      where: after ? { id: MoreThan(after) } : {},
      take: 50,
      order: { id: 'ASC' },
    });
  }
  @Transactional()
  async retry(id: string) {
    const repo = this.db.getRepository(RevocationJob);
    const job = await repo.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!job) throw new NotFoundException();
    if (job.status !== 'failed')
      throw new ConflictException('실패한 작업만 재시도할 수 있습니다.');
    job.status = 'pending';
    job.attempts = 0;
    job.nextAttemptAt = new Date();
    await repo.save(job);
  }
  @Transactional()
  async purge(cutoff: Date): Promise<number> {
    const users = await this.db
      .getRepository(User)
      .createQueryBuilder('user')
      .withDeleted()
      .where('user.deletedAt <= :cutoff', { cutoff })
      .orderBy('user.id', 'ASC')
      .take(100)
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .getMany();
    if (!users.length) return 0;
    const ids = users.map((user) => user.id);
    for (const entity of [
      AuthIdentity,
      RefreshToken,
      UserAnswer,
      UserFollowupAnswer,
      UserSummary,
      UserPhilosopherCount,
      UserDailyQuestion,
      OnboardingSession,
      Inquiry,
      RevocationJob,
    ]) {
      await this.db
        .createQueryBuilder()
        .delete()
        .from(entity)
        .where({ userId: In(ids) })
        .execute();
    }
    await this.db
      .getRepository(Inquiry)
      .update({ answeredBy: In(ids) }, { answeredBy: null });
    await this.db
      .getRepository(Notice)
      .update({ authorId: In(ids) }, { authorId: null });
    await this.db.getRepository(User).delete({ id: In(ids) });
    return ids.length;
  }
}
