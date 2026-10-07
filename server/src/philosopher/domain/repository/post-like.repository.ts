export const POST_LIKE_REPOSITORY = Symbol('POST_LIKE_REPOSITORY');
export interface PostLikeState {
  count: number;
  liked: boolean;
}
export interface PostLikeRepository {
  state(postId: string, userId?: string): Promise<PostLikeState>;
  set(postId: string, userId: string, liked: boolean): Promise<void>;
}
