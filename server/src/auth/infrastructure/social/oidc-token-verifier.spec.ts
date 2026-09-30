import { generateKeyPairSync } from 'crypto';
import { sign, type SignOptions } from 'jsonwebtoken';
import { JwksClient, SigningKeyNotFoundError } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { OidcTokenVerifier } from './oidc-token-verifier';
import { AuthType } from '../../domain/enums/auth-Type.enum';

const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const key = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const issuers = {
  google: 'https://accounts.google.com',
  apple: 'https://appleid.apple.com',
  kakao: 'https://kauth.kakao.com',
};

describe('OIDC signature and claims', () => {
  let verifier: OidcTokenVerifier;
  beforeEach(() => {
    jest.spyOn(JwksClient.prototype, 'getSigningKey').mockResolvedValue({
      kid: 'test-key',
      publicKey: key,
      getPublicKey: () => key,
    });
    verifier = new OidcTokenVerifier(
      new ConfigService({
        GOOGLE_CLIENT_IDS: 'client',
        APPLE_CLIENT_IDS: 'client',
        KAKAO_CLIENT_IDS: 'client',
      }),
    );
  });
  afterEach(() => jest.restoreAllMocks());
  function token(
    provider: AuthType,
    claims: Record<string, unknown> = {},
    options: SignOptions = {},
  ) {
    return sign(
      {
        nonce: 'challenge-nonce',
        email: 'same@example.com',
        email_verified: true,
        ...claims,
      },
      keys.privateKey,
      {
        algorithm: 'RS256',
        keyid: 'test-key',
        issuer: issuers[provider],
        audience: 'client',
        subject: 'provider-user',
        expiresIn: 300,
        ...options,
      },
    );
  }
  it.each(Object.values(AuthType))(
    'validates %s using its own issuer',
    async (provider) => {
      await expect(
        verifier.verify(provider, token(provider), 'challenge-nonce'),
      ).resolves.toMatchObject({
        provider,
        subject: 'provider-user',
        email: 'same@example.com',
      });
    },
  );
  it.each([
    ['wrong audience', { audience: 'other-app' }],
    ['wrong issuer', { issuer: 'https://attacker.example' }],
    ['expired', { expiresIn: -60 }],
  ] as [string, SignOptions][])('rejects %s', async (_name, options) => {
    await expect(
      verifier.verify(
        AuthType.GOOGLE,
        token(AuthType.GOOGLE, {}, options),
        'challenge-nonce',
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('rejects nonce mismatch', async () => {
    await expect(
      verifier.verify(AuthType.APPLE, token(AuthType.APPLE), 'other-nonce'),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('rejects provider mixup', async () => {
    await expect(
      verifier.verify(
        AuthType.KAKAO,
        token(AuthType.GOOGLE),
        'challenge-nonce',
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('rejects unsigned tokens and wrong signatures', async () => {
    await expect(
      verifier.verify(
        AuthType.GOOGLE,
        'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.',
        'challenge-nonce',
      ),
    ).rejects.toMatchObject({ status: 401 });
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const forged = sign({ nonce: 'challenge-nonce' }, other.privateKey, {
      algorithm: 'RS256',
      keyid: 'test-key',
      issuer: issuers.google,
      audience: 'client',
      subject: 'user',
      expiresIn: 300,
    });
    await expect(
      verifier.verify(AuthType.GOOGLE, forged, 'challenge-nonce'),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('allows hidden or absent email without inventing one', async () => {
    await expect(
      verifier.verify(
        AuthType.APPLE,
        token(AuthType.APPLE, { email_verified: false }),
        'challenge-nonce',
      ),
    ).resolves.toMatchObject({ email: null });
  });
  it('requires expiry even on a correctly signed token', async () => {
    const noExpiry = sign({ nonce: 'challenge-nonce' }, keys.privateKey, {
      algorithm: 'RS256',
      keyid: 'test-key',
      issuer: issuers.google,
      audience: 'client',
      subject: 'user',
    });
    await expect(
      verifier.verify(AuthType.GOOGLE, noExpiry, 'challenge-nonce'),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('fails closed if provider is not configured', async () => {
    const disabled = new OidcTokenVerifier(new ConfigService());
    await expect(
      disabled.verify(
        AuthType.GOOGLE,
        token(AuthType.GOOGLE),
        'challenge-nonce',
      ),
    ).rejects.toMatchObject({ status: 503 });
  });
  it('distinguishes unknown keys from provider outage', async () => {
    jest
      .spyOn(JwksClient.prototype, 'getSigningKey')
      .mockRejectedValueOnce(new SigningKeyNotFoundError('unknown'))
      .mockRejectedValueOnce(new Error('offline'));
    await expect(
      verifier.verify(
        AuthType.GOOGLE,
        token(AuthType.GOOGLE),
        'challenge-nonce',
      ),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      verifier.verify(
        AuthType.GOOGLE,
        token(AuthType.GOOGLE),
        'challenge-nonce',
      ),
    ).rejects.toMatchObject({ status: 503 });
  });
});
