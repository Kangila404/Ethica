import { UserAnswer } from '../model/user-answer.entity';

export const USER_ANSWER_REPOSITORY = Symbol('USER_ANSWER_REPOSITORY');

export interface UserAnswerRepository {
  save(userAnswer: UserAnswer): Promise<UserAnswer>;

  countByUserId(userId: string, isOnboarding: boolean): Promise<number>;

  findByUserId(userId: string, isOnboarding: boolean): Promise<UserAnswer[]>;
}
