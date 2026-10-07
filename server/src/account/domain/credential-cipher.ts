export const CREDENTIAL_CIPHER = Symbol('CREDENTIAL_CIPHER');
export interface CredentialCipher {
  assertConfigured(): void;
  encrypt(value: string): string;
  decrypt(value: string): string;
}
