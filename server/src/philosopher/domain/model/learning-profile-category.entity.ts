import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Philosopher } from './philosopher.entity';

export enum LearningCategory {
  PHILOSOPHY = 'philosophy',
  LITERATURE = 'literature',
  MYTHOLOGY = 'mythology',
}

/** Editorial profile roles, independent of daily-question scoring. */
@Entity('learning_profile_category')
export class LearningProfileCategory {
  @PrimaryColumn({ type: 'bigint', name: 'philosopher_id' })
  philosopherId!: string;

  @PrimaryColumn({ type: 'varchar', length: 20 })
  category!: LearningCategory;

  @ManyToOne(() => Philosopher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'philosopher_id' })
  philosopher!: Philosopher;
}
