import { Post } from '../model/post.entity';

export const POST_REPOSITORY = Symbol('POST_REPOSITORY');

export interface PostRepository {
  findById(id: string): Promise<Post | null>;

  findByPhilosopherId(philosopherId: string): Promise<Post[]>;

  countByPhilosopherId(philosopherId:string): Promise<number>;
}
