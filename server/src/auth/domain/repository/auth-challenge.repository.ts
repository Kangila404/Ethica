import { AuthChallenge } from '../model/auth-challenge.entity';
export const AUTH_CHALLENGE_REPOSITORY = Symbol('AUTH_CHALLENGE_REPOSITORY');
export interface AuthChallengeRepository {
  save(challenge: AuthChallenge): Promise<void>;
  findValid(id: string): Promise<AuthChallenge | null>;
  consume(id: string): Promise<boolean>;
}
