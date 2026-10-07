import { Question } from '../model/question.entity';

export const QUESTION_REPOSITORY = Symbol('QUESTION_REPOSITORY');

export interface QuestionRepository {
  findById(id: string, lock?: boolean): Promise<Question | null>;

  findByIds(ids: string[]): Promise<Question[]>;

  findOnboardingByCategory(
    categoryId: string,
    limit: number,
  ): Promise<Question[]>;

  findByIdWithAnswers(
    questionId: string,
    lock?: boolean,
  ): Promise<Question | null>;

  findRandomDailyExcluding(excludeIds: string[]): Promise<Question | null>;
}
