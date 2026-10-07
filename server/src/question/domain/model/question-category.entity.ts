import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Question } from './question.entity';

@Entity('question_category')
export class QuestionCategory {
  @PrimaryColumn({ type: 'bigint' })
  questionId!: string;

  @PrimaryColumn({ type: 'bigint' })
  categoryId!: string;

  @ManyToOne(() => Question, (q) => q.categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question!: Question;
}
