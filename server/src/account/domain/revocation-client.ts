import { AuthType } from 'src/auth/domain/enums/auth-Type.enum';
export interface RevocationCredential {
  provider: AuthType;
  token: string;
  clientId?: string;
  subject?: string;
}
export const REVOCATION_CLIENT = Symbol('REVOCATION_CLIENT');
export interface RevocationClient {
  prepare(
    provider: AuthType,
    subject: string,
    credential: string,
    nonce: string,
  ): Promise<RevocationCredential>;
  revoke(credential: RevocationCredential): Promise<void>;
}
