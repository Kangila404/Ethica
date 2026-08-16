import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { DailyQuestionStatus } from '../enums/daily-question-status.enum';
import { BaseEntity } from 'src/common/Base.entity';

@Entity('user_daily_question')
@Unique(['userId', 'serviceDate'])
@Unique(['userId', 'questionId'])
export class UserDailyQuestion extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint' })
  userId!: string;

  @Column({ type: 'bigint' })
  questionId!: string;

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
