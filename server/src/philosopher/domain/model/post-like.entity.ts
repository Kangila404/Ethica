import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Post } from './post.entity';
import { User } from 'src/user/domain/model/user.entity';

@Entity('post_like')
export class PostLike {
  @PrimaryColumn({ name: 'post_id', type: 'bigint' }) postId!: string;
  @PrimaryColumn({ name: 'user_id', type: 'bigint' }) userId!: string;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: Post;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
