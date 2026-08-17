import { FollowupAnswer } from '../model/followup-answer.entity';

export const FOLLOWUP_ANSWER_REPOSITORY = Symbol('FOLLOWUP_ANSWER_REPOSITORY');

export interface FollowupAnswerRepository {
  findById(id: string): Promise<FollowupAnswer | null>;

  findByIds(ids: string[]): Promise<FollowupAnswer[]>;
}
