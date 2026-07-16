import { AuthIdentity } from '../model/auth-identity.entity';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface AuthRepository {
  findByEmail(email: string): Promise<AuthIdentity | null>;

  save(identity: AuthIdentity): Promise<void>;
}
