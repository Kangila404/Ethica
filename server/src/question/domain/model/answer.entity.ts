import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Question } from './question.entity';

@Entity('answer')
export class Answer extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint' })
  questionId!: string;

  @Column({ type: 'bigint' })
  philosopherId!: string;

  @Column({ type: 'varchar', length: 255 })
  body!: string;

  @Column({ type: 'text' })
  explanation!: string;

  // 관계
  @ManyToOne(() => Question, (q) => q.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question!: Question;
}
