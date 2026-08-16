import { Question } from '../model/question.entity';

export const QUESTION_REPOSITORY = Symbol('QUESTION_REPOSITORY');

export interface QuestionRepository {

  findById(id:string):Promise<Question | null>;

  findOnboardingByCategory(
    categoryId: string,
    limit: number,
  ): Promise<Question[]>;

  findByIdWithAnswers(questionId: string): Promise<Question | null>;

  findRandomDailyExcluding(excludeIds: string[]):Promise<Question | null>;
}
