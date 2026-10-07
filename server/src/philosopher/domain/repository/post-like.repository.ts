export const POST_LIKE_REPOSITORY = Symbol('POST_LIKE_REPOSITORY');
export interface PostLikeState {
  count: number;
  liked: boolean;
}
export interface LikedPost {
  id: string;
  title: string;
  imageKey: string | null;
  philosopherId: string;
  philosopherName: string;
}
export interface PostLikeRepository {
  listForUser(userId: string): Promise<LikedPost[]>;
  state(postId: string, userId?: string): Promise<PostLikeState>;
  set(postId: string, userId: string, liked: boolean): Promise<void>;
}
