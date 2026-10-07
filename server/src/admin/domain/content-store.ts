import { ContentStatus } from 'src/common/content-status';
import { QuestionUsage } from 'src/question/domain/enum/question-usage.enum';
import { Category } from 'src/category/domain/model/category.entity';
import { Philosopher } from 'src/philosopher/domain/model/philosopher.entity';
import { Post } from 'src/philosopher/domain/model/post.entity';
import { PostSegment } from 'src/philosopher/domain/model/post-segment.entity';
import { Question } from 'src/question/domain/model/question.entity';
import { Answer } from 'src/question/domain/model/answer.entity';
import { FollowupAnswer } from 'src/question/domain/model/followup-answer.entity';
export type ContentKind = 'categories' | 'philosophers' | 'posts' | 'segments';
export type Content = Category | Philosopher | Post | PostSegment;
export type QuestionWrite = Pick<
  Question,
  'usage' | 'type' | 'title' | 'stage1Body'
> & {
  status?: ContentStatus;
  isActive?: boolean;
  imageKey?: string | null;
  followupBody?: string | null;
  categoryIds: string[];
  answers: (Pick<Answer, 'body' | 'explanation' | 'philosopherId'> & {
    id?: string;
  })[];
  followupAnswers: (Pick<FollowupAnswer, 'body' | 'explanation'> & {
    id?: string;
  })[];
};
export type ContentFilters = {
  status?: ContentStatus;
  search?: string;
  usage?: QuestionUsage;
  categoryId?: string;
};
export const CONTENT_STORE = Symbol('CONTENT_STORE');
export interface ContentStore {
  list(
    kind: ContentKind,
    after?: string,
    filters?: ContentFilters,
  ): Promise<Content[]>;
  get(kind: ContentKind, id: string): Promise<Content>;
  save(
    kind: ContentKind,
    input: Partial<Content>,
    id?: string,
  ): Promise<Content>;
  remove(kind: ContentKind, id: string): Promise<void>;
  questions(after?: string, filters?: ContentFilters): Promise<Question[]>;
  question(id: string): Promise<Question>;
  saveQuestion(input: QuestionWrite, id?: string): Promise<Question>;
  deactivateQuestion(id: string): Promise<void>;
  users(after?: string): Promise<object[]>;
  user(userId: string): Promise<object>;
}
