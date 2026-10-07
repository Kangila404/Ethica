import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  OneToMany,
} from 'typeorm';
import { Post } from './post.entity';
import { LearningProfileCategory } from './learning-profile-category.entity';

@Entity('philosopher')
export class Philosopher extends BaseEntity {
  // The legacy name/ID stays stable for old clients and answer history.
  @OneToMany(
    () => LearningProfileCategory,
    (category) => category.philosopher,
    { eager: true },
  )
  learningCategories!: LearningProfileCategory[];

  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  era!: string;

  @Column({ type: 'varchar', length: 50 })
  school!: string;

  @Column({ type: 'text' })
  coreThought!: string;

  @Column({ type: 'text' })
  lifeRoots!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageKey!: string | null;

  @OneToMany(() => Post, (post) => post.philosopher)
  posts!: Post[];
}
