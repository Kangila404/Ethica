import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostLike } from '../../../domain/model/post-like.entity';
import type { PostLikeRepository } from '../../../domain/repository/post-like.repository';

@Injectable()
export class PostLikeRepositoryImpl implements PostLikeRepository {
  constructor(
    @InjectRepository(PostLike)
    private readonly repository: Repository<PostLike>,
  ) {}

  async state(postId: string, userId?: string) {
    const [count, liked] = await Promise.all([
      this.repository.countBy({ postId }),
      userId ? this.repository.existsBy({ postId, userId }) : false,
    ]);
    return { count, liked };
  }

  async set(postId: string, userId: string, liked: boolean) {
    if (!liked) {
      await this.repository.delete({ postId, userId });
      return;
    }
    // Composite PK makes retries/concurrent PUTs idempotent. No counter to drift.
    await this.repository
      .createQueryBuilder()
      .insert()
      .values({ postId, userId })
      .orUpdate(['user_id'], ['post_id', 'user_id'])
      .execute();
  }
}
