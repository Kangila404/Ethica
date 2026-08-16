import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Question } from './question.entity';

@Entity('followup_answer')
export class FollowupAnswer extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint' })
  questionId!: string;

  @Column({ type: 'varchar', length: 255 })
  body!: string;

  @Column({ type: 'text', nullable: true })
  explanation!: string | null;

  // 관계
  @ManyToOne(() => Question, (q) => q.followupAnswers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;
}
