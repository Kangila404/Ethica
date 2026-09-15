import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Philosopher } from './philosopher.entity';
import { PostSegment } from './post-segment.entity';

@Entity('post')
export class Post extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => Philosopher, (philosopher) => philosopher.posts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'philosopher_id' })
  philosopher!: Philosopher;

  @Column({ name: 'philosopher_id', type: 'bigint' })
  philosopherId!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ name: 'image_key', type: 'varchar', length: 255, nullable: true })
  imageKey!: string | null;

  @OneToMany(() => PostSegment, (segment) => segment.post)
  segments!: PostSegment[];
}
