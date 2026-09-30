import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BaseEntity } from 'src/common/Base.entity';

export type UserSummaryInsight = {
  title: string;
  summary: string;
  userAnswerIds: string[];
};

@Entity('user_summary')
@Unique(['userId'])
export class UserSummary extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'nearest_philosopher_id', type: 'bigint' })
  nearestPhilosopherId!: string;

  @Column({ name: 'overall_summaries', type: 'json' })
  overallSummaries!: UserSummaryInsight[];

  @Column({ name: 'contradictions', type: 'json' })
  contradictions!: UserSummaryInsight[];

  @Column({ type: 'int' })
  accuracy!: number;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: 'pending' | 'processing' | 'ready' | 'failed';

  @Column({ type: 'char', length: 64, nullable: true })
  sourceFingerprint!: string | null;

  @Column({ type: 'char', length: 36, nullable: true })
  generationToken!: string | null;

  @Column({ type: 'datetime', nullable: true })
  generationStartedAt!: Date | null;

  static create(
    userId: string,
    nearestPhilosopherId: string,
    overallSummaries: UserSummaryInsight[],
    contradictions: UserSummaryInsight[],
    accuracy: number,
  ): UserSummary {
    const userSummary = new UserSummary();
    userSummary.userId = userId;
    userSummary.nearestPhilosopherId = nearestPhilosopherId;
    userSummary.overallSummaries = overallSummaries;
    userSummary.contradictions = contradictions;
    userSummary.accuracy = accuracy;
    return userSummary;
  }

  update(
    nearestPhilosopherId: string,
    overallSummaries: UserSummaryInsight[],
    contradictions: UserSummaryInsight[],
    accuracy: number,
  ): void {
    this.nearestPhilosopherId = nearestPhilosopherId;
    this.overallSummaries = overallSummaries;
    this.contradictions = contradictions;
    this.accuracy = accuracy;
  }
}
