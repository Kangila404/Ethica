import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  POST_LIKE_REPOSITORY,
  type PostLikeRepository,
} from '../domain/repository/post-like.repository';
import {
  POST_REPOSITORY,
  type PostRepository,
} from '../domain/repository/post.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from 'src/user/domain/repository/user.repository';
import { UserStatus } from 'src/user/domain/enum/user-status.enum';

@Injectable()
export class PostLikeService {
  constructor(
    @Inject(POST_LIKE_REPOSITORY) private readonly likes: PostLikeRepository,
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  private async published(postId: string) {
    if (!(await this.posts.findById(postId)))
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
  }
  private async userId(uuid: string) {
    const user = await this.users.findByUserId(uuid);
    if (!user || user.userStatus !== UserStatus.ACTIVE)
      throw new UnauthorizedException();
    return user.id;
  }
  async list(uuid: string) {
    return { items: await this.likes.listForUser(await this.userId(uuid)) };
  }
  async state(postId: string, uuid?: string) {
    await this.published(postId);
    return this.likes.state(postId, uuid ? await this.userId(uuid) : undefined);
  }
  async set(postId: string, uuid: string, liked: boolean) {
    await this.published(postId);
    const userId = await this.userId(uuid);
    await this.likes.set(postId, userId, liked);
    return this.likes.state(postId, userId);
  }
}
