import { AuthType } from '../enums/auth-Type.enum';
import { AuthIdentity } from '../model/auth-identity.entity';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface AuthRepository {
  findByProvider(
    authType: AuthType,
    providerUid: string,
  ): Promise<AuthIdentity | null>;

  save(identity: AuthIdentity): Promise<void>;
}
