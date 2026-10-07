import { UserPhilosopherCount } from '../model/user-philosopher-count.entity';

export const USER_PHILOSOPHER_COUNT_REPOSITORY = Symbol(
  'USER_PHILOSOPHER_COUNT_REPOSITORY',
);

export interface UserPhilosopherCountRepository {
  increase(userId: string, philosopherId: string): Promise<void>;

  findByUserId(userId: string): Promise<UserPhilosopherCount[]>;
}
