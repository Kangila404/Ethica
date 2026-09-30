import { AuthType } from '../enums/auth-Type.enum';

export const SOCIAL_TOKEN_VERIFIER = Symbol('SOCIAL_TOKEN_VERIFIER');
export interface SocialProfile {
  provider: AuthType;
  subject: string;
  email: string | null;
  name: string | null;
}
export interface SocialTokenVerifier {
  assertConfigured(provider: AuthType): void;
  verify(
    provider: AuthType,
    idToken: string,
    nonce: string,
  ): Promise<SocialProfile>;
}
