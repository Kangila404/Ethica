import { AuthIdentity } from 'src/auth/domain/model/auth-identity.entity';
import { RevocationJob } from './model/revocation-job.entity';
export const ACCOUNT_STORE = Symbol('ACCOUNT_STORE');
export interface AccountStore {
  identity(userId: string): Promise<AuthIdentity>;
  withdraw(
    userId: string,
    identityId: string,
    challengeId: string,
    encryptedCredential: string,
  ): Promise<void>;
  claim(now: Date): Promise<RevocationJob | null>;
  finish(id: string, token: string, success: boolean, now: Date): Promise<void>;
  retry(id: string): Promise<void>;
  jobs(after?: string): Promise<RevocationJob[]>;
  purge(cutoff: Date): Promise<number>;
}
