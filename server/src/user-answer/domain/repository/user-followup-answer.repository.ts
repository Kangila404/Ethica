import { UserFollowupAnswer } from '../model/user-followup-answer.entity';

export const USER_FOLLOWUP_ANSWER_REPOSITORY = Symbol(
  'USER_FOLLOWUP_ANSWER_REPOSITORY',
);

export interface UserFollowupAnswerRepository {
  save(entity: UserFollowupAnswer): Promise<UserFollowupAnswer>;
}
