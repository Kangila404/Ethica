import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthType } from '../domain/enums/auth-Type.enum';
import { User } from '../../user/domain/model/user.entity';
import { UserStatus } from '../../user/domain/enum/user-status.enum';
import { UserRole } from '../../user/domain/enum/user-role.enum';
import { OnboardingStatus } from '../../user/domain/enum/OnboardingStatus.enum';
import { AuthIdentity } from '../domain/model/auth-identity.entity';
import { AuthChallenge } from '../domain/model/auth-challenge.entity';
import { RefreshToken } from '../domain/model/refresh-token.entity';

// Unit tests exercise orchestration; DB transactions are checked separately.
jest.mock('typeorm-transactional', () => ({
  Transactional:
    () => (_target: object, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('social login lifecycle', () => {
  function setup() {
    const identities: AuthIdentity[] = [];
    const users: User[] = [];
    const pending = new Map<string, AuthChallenge>();
    const tokens = new Map<string, RefreshToken>();
    const auth = {
      findByProvider: jest.fn((p: AuthType, id: string) =>
        Promise.resolve(
          identities.find((i) => i.authType === p && i.providerUid === id) ??
            null,
        ),
      ),
      save: jest.fn((i: AuthIdentity) => {
        identities.push(i);
        return Promise.resolve();
      }),
    };
    const userRepo = {
      findById: jest.fn((id: string) =>
        Promise.resolve(users.find((u) => u.id === id && !u.deletedAt) ?? null),
      ),
      findByUserId: jest.fn((id: string) =>
        Promise.resolve(
          users.find((u) => u.userId === id && !u.deletedAt) ?? null,
        ),
      ),
      save: jest.fn((user: User) => {
        if (!user.id) {
          Object.assign(user, {
            id: String(users.length + 1),
            userId: `uuid-${users.length + 1}`,
            userRole: UserRole.USER,
            userStatus: UserStatus.ACTIVE,
            onboardingStatus: OnboardingStatus.INCOMPLETE,
          });
          users.push(user);
        }
        return Promise.resolve();
      }),
      softRemove: jest.fn(),
      findAllActive: jest.fn(),
    };
    const refresh = {
      save: jest.fn((t: RefreshToken) => {
        tokens.set(t.tokenHash, t);
        return Promise.resolve();
      }),
      findByTokenHash: jest.fn((h: string) =>
        Promise.resolve(tokens.get(h) ?? null),
      ),
      deleteByTokenHash: jest.fn((h: string) =>
        Promise.resolve(tokens.delete(h) ? 1 : 0),
      ),
    };
    const verifier = {
      assertConfigured: jest.fn(),
      verify: jest.fn((provider: AuthType) =>
        Promise.resolve({
          provider,
          subject: 'same-sub',
          email: 'same@example.com',
          name: null,
        }),
      ),
    };
    const challenges = {
      save: jest.fn((c: AuthChallenge) => {
        pending.set(c.id, c);
        return Promise.resolve();
      }),
      findValid: jest.fn((id: string) =>
        Promise.resolve(pending.get(id) ?? null),
      ),
      consume: jest.fn((id: string) => Promise.resolve(pending.delete(id))),
    };
    const service = new AuthService(
      auth,
      userRepo,
      refresh,
      verifier,
      challenges,
      new JwtService({ secret: 'unit-test-secret-not-for-use-outside-tests' }),
    );
    async function login(provider = AuthType.GOOGLE) {
      const c = await service.createChallenge({ provider });
      return service.socialLogin({
        provider,
        challengeId: c.challengeId,
        idToken: 'provider-token',
      });
    }
    return {
      service,
      login,
      identities,
      users,
      verifier,
      challenges,
      auth,
      refresh,
    };
  }
  it('creates once, then logs in to the same account', async () => {
    const s = setup();
    const first = await s.login();
    const second = await s.login();
    expect(first.user.userId).toBe(second.user.userId);
    expect(s.users).toHaveLength(1);
    expect(second.user.role).toBe('user');
    expect(s.identities[0].providerUid).toBe('same-sub');
  });
  it('keeps identical emails and subjects separate across providers', async () => {
    const s = setup();
    for (const p of Object.values(AuthType)) await s.login(p);
    expect(s.users).toHaveLength(3);
    expect(s.identities).toHaveLength(3);
  });
  it('rejects reused, missing, and provider-mismatched challenges', async () => {
    const s = setup();
    const c = await s.service.createChallenge({ provider: AuthType.APPLE });
    await expect(
      s.service.socialLogin({
        provider: AuthType.KAKAO,
        challengeId: c.challengeId,
        idToken: 'x',
      }),
    ).rejects.toMatchObject({ status: 401 });
    await s.service.socialLogin({
      provider: AuthType.APPLE,
      challengeId: c.challengeId,
      idToken: 'x',
    });
    await expect(
      s.service.socialLogin({
        provider: AuthType.APPLE,
        challengeId: c.challengeId,
        idToken: 'x',
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('does not create accounts or consume challenges for invalid tokens', async () => {
    const s = setup();
    s.verifier.verify.mockRejectedValueOnce(new Error('invalid token'));
    await expect(s.login()).rejects.toThrow('invalid token');
    expect(s.auth.save).not.toHaveBeenCalled();
    expect(s.challenges.consume).not.toHaveBeenCalled();
  });
  it('rejects suspended and withdrawn users', async () => {
    const s = setup();
    await s.login();
    s.users[0].userStatus = UserStatus.SUSPENDED;
    await expect(s.login()).rejects.toMatchObject({ status: 401 });
    s.users[0].deletedAt = new Date();
    await expect(s.login()).rejects.toMatchObject({ status: 401 });
  });
  it('rotates refresh tokens and prevents reuse after logout', async () => {
    const s = setup();
    const first = await s.login();
    const second = await s.service.refreshToken({
      refreshToken: first.refreshToken,
    });
    expect(second.refreshToken).not.toBe(first.refreshToken);
    await expect(
      s.service.refreshToken({ refreshToken: first.refreshToken }),
    ).rejects.toMatchObject({ status: 401 });
    await s.service.logout({ refreshToken: second.refreshToken });
    await expect(
      s.service.refreshToken({ refreshToken: second.refreshToken }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
