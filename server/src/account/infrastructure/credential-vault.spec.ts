import { ConfigService } from '@nestjs/config';
import { CredentialVault } from './credential-vault';
describe('encrypted revocation credentials', () => {
  const vault = new CredentialVault(
    new ConfigService({ SOCIAL_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64) }),
  );
  it('encrypts with a fresh IV and verifies authenticity on decryption', () => {
    const first = vault.encrypt('private-refresh-token'),
      second = vault.encrypt('private-refresh-token');
    expect(first).not.toBe(second);
    expect(first).not.toContain('private-refresh-token');
    expect(vault.decrypt(first)).toBe('private-refresh-token');
    const tampered = Buffer.from(first, 'base64');
    tampered[30] ^= 1;
    expect(() => vault.decrypt(tampered.toString('base64'))).toThrow();
  });
  it('rejects missing keys and a different encryption key', () => {
    expect(() =>
      new CredentialVault(new ConfigService()).encrypt('token'),
    ).toThrow();
    const other = new CredentialVault(
      new ConfigService({ SOCIAL_TOKEN_ENCRYPTION_KEY: 'b'.repeat(64) }),
    );
    expect(() => other.decrypt(vault.encrypt('token'))).toThrow();
  });
});
