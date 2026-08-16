import { Answer } from 'src/question/domain/model/answer.entity';

export const ANSWER_REPOSITORY = Symbol('ANSWER_REPOSITORY');

export interface AnswerRepository {
  findById(id: string): Promise<Answer | null>;
}
