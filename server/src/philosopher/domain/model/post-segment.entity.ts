import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Post } from './post.entity';

export enum PostSegmentType {
  TEXT = 'text',
  IMAGE = 'image',
}

@Entity('post_segment')
export class PostSegment extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => Post, (post) => post.segments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: Post;

  @Column({ name: 'post_id', type: 'bigint' })
  postId!: string;

  @Column({ name: 'segment_type', type: 'enum', enum: PostSegmentType })
  segmentType!: PostSegmentType;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Column({ name: 'image_key', type: 'varchar', length: 255, nullable: true })
  imageKey!: string | null;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder!: number;
}
