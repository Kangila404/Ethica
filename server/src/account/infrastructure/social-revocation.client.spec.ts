import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'node:crypto';
import { SocialRevocationClient } from './social-revocation.client';
import { AuthType } from 'src/auth/domain/enums/auth-Type.enum';
describe('social revocation protocol', () => {
  const verifier = { assertConfigured: jest.fn(), verify: jest.fn() };
  const privateKey = generateKeyPairSync('ec', { namedCurve: 'P-256' })
    .privateKey.export({ type: 'pkcs8', format: 'pem' })
    .toString();
  const client = new SocialRevocationClient(
    new ConfigService({
      GOOGLE_CLIENT_IDS: 'test-google',
      KAKAO_APP_ID: '123',
      KAKAO_ADMIN_KEY: 'test-admin',
      APPLE_TEAM_ID: 'team',
      APPLE_KEY_ID: 'kid',
      APPLE_PRIVATE_KEY: privateKey,
      APPLE_REVOCATION_CLIENT_ID: 'test.apple',
    }),
    verifier,
  );
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
    verifier.verify.mockReset();
  });
  afterEach(() => {
    fetchMock.mockRestore();
  });
  function json(body: object, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  it('rejects access tokens belonging to another Google user or client', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ sub: 'other', aud: 'test-google', expires_in: '300' }),
    );
    await expect(
      client.prepare(AuthType.GOOGLE, 'owner', 'token', 'nonce'),
    ).rejects.toThrow();
    fetchMock.mockResolvedValueOnce(
      json({ sub: 'owner', aud: 'other-client', expires_in: '300' }),
    );
    await expect(
      client.prepare(AuthType.GOOGLE, 'owner', 'token', 'nonce'),
    ).rejects.toThrow();
  });
  it('validates and revokes Google access using a form body without exposing the token in the revoke URL', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ sub: 'owner', aud: 'test-google', expires_in: '300' }),
      )
      .mockResolvedValueOnce(new Response('', { status: 200 }));
    const credential = await client.prepare(
      AuthType.GOOGLE,
      'owner',
      'secret-token',
      'nonce',
    );
    await client.revoke(credential);
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://oauth2.googleapis.com/revoke',
    );
    expect(
      (fetchMock.mock.calls[1][1]?.body as URLSearchParams).toString(),
    ).toBe('token=secret-token');
  });
  it('uses the verified Kakao subject with the admin key so retries survive access-token expiration', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ id: 77, app_id: 123, expires_in: 300 }))
      .mockResolvedValueOnce(json({ id: 77 }));
    const credential = await client.prepare(
      AuthType.KAKAO,
      '77',
      'access-token',
      'nonce',
    );
    expect(credential.token).toBe('');
    await client.revoke(credential);
    expect(
      (fetchMock.mock.calls[1][1]?.body as URLSearchParams).toString(),
    ).toBe('target_id_type=user_id&target_id=77');
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({
      Authorization: 'KakaoAK test-admin',
    });
  });
  it('rejects a Kakao token issued for another application', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ id: 77, app_id: 999, expires_in: 300 }),
    );
    await expect(
      client.prepare(AuthType.KAKAO, '77', 'token', 'nonce'),
    ).rejects.toThrow();
  });
  it('exchanges the Apple code, checks the returned identity and revokes the refresh token', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ id_token: 'apple-id', refresh_token: 'apple-refresh' }),
      )
      .mockResolvedValueOnce(new Response('', { status: 200 }));
    verifier.verify.mockResolvedValue({
      provider: AuthType.APPLE,
      subject: 'owner',
      email: null,
      name: null,
    });
    const credential = await client.prepare(
      AuthType.APPLE,
      'owner',
      'single-use-code',
      'nonce',
    );
    expect(verifier.verify).toHaveBeenCalledWith(
      AuthType.APPLE,
      'apple-id',
      'nonce',
    );
    await client.revoke(credential);
    const body = new URLSearchParams(
      (fetchMock.mock.calls[1][1]?.body as URLSearchParams).toString(),
    );
    expect(body.get('token')).toBe('apple-refresh');
    expect(body.get('token_type_hint')).toBe('refresh_token');
    expect(body.get('client_id')).toBe('test.apple');
  });
  it('does not accept a different Apple subject or swallow provider outages', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ id_token: 'apple-id', refresh_token: 'apple-refresh' }),
    );
    verifier.verify.mockResolvedValue({
      provider: AuthType.APPLE,
      subject: 'other',
    });
    await expect(
      client.prepare(AuthType.APPLE, 'owner', 'code', 'nonce'),
    ).rejects.toThrow();
    fetchMock.mockRejectedValueOnce(new Error('network'));
    await expect(
      client.revoke({ provider: AuthType.GOOGLE, token: 'private' }),
    ).rejects.toThrow('소셜 제공자에 연결할 수 없습니다.');
  });
  it('only accepts confirmed Kakao unlink and retains uncertain Google revocations as failures', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'invalid_token' }, 400));
    await expect(
      client.revoke({ provider: AuthType.GOOGLE, token: 'old' }),
    ).rejects.toThrow();
    fetchMock.mockResolvedValueOnce(json({ code: -101 }, 400));
    await expect(
      client.revoke({ provider: AuthType.KAKAO, subject: '77', token: '' }),
    ).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(json({ code: -10 }, 400));
    await expect(
      client.revoke({ provider: AuthType.KAKAO, subject: '77', token: '' }),
    ).rejects.toThrow();
  });
});
