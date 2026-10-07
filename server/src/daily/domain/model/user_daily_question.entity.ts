import { instantTransformer } from 'src/common/instant.transformer';
import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { DailyQuestionStatus } from '../enums/daily-question-status.enum';
import { BaseEntity } from 'src/common/Base.entity';

@Entity('user_daily_question')
@Unique(['userId', 'questionId'])
export class UserDailyQuestion extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint' })
  userId!: string;

  @Column({ type: 'bigint', nullable: true })
  questionId!: string | null;

  @Column({ type: 'bigint', nullable: true, transformer: instantTransformer })
  openedAt!: Date | null;

  @Column({ type: 'bigint', nullable: true })
  answerId!: string | null;

  @Column({ type: 'bigint', nullable: true })
  followupAnswerId!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  notificationStatus!: string;

  @Column({ type: 'char', length: 36, nullable: true })
  notificationToken!: string | null;

  @Column({ type: 'bigint', nullable: true, transformer: instantTransformer })
  notificationAttemptAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  notificationAttempts!: number;

  @Column({ type: 'date' })
  serviceDate!: string;

  @Column({
    type: 'enum',
    enum: DailyQuestionStatus,
    default: DailyQuestionStatus.PENDING,
  })
  status!: DailyQuestionStatus;

  // 비즈니스 로직
  // 1. 오늘의 문제 상태 변경
  complete(): void {
    this.status = DailyQuestionStatus.COMPLETED;
  }
}
