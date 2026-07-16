import { Question } from '../model/question.entity';

export const QUESTION_REPOSITORY = Symbol('QUESTION_REPOSITORY');

export interface QuestionRepository {
  findOnboardingByCategory(
    categoryId: string,
    limit: number,
  ): Promise<Question[]>;
}
