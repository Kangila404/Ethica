import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuestionUsage } from '../enum/question-usage.enum';
import { QuestionType } from '../enum/question-type.enum';
import { Answer } from './answer.entity';
import { FollowupAnswer } from './followup-answer.entity';
import { QuestionCategory } from './question-category.entity';

@Entity('question')
export class Question extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'enum', enum: QuestionUsage })
  usage!: QuestionUsage;

  @Column({ type: 'enum', enum: QuestionType })
  type!: QuestionType;

  @Column({type: 'varchar', length: 100})
  title!: string;

  @Column({ type: 'text' })
  stage1Body!: string;

  @Column({ type: 'text', nullable: true })
  followupBody!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageKey!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // 애그리거트
  @OneToMany(() => Answer, (a) => a.question, { cascade: true })
  answers!: Answer[];

  @OneToMany(() => FollowupAnswer, (f) => f.question, { cascade: true })
  followupAnswers!: FollowupAnswer[];

  @OneToMany(() => QuestionCategory, (qc) => qc.question, { cascade: true })
  categories!: QuestionCategory[];
}
