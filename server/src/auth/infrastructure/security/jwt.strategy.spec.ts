import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../../../user/domain/model/user.entity';
import { UserStatus } from '../../../user/domain/enum/user-status.enum';
import { UserRole } from '../../../user/domain/enum/user-role.enum';

describe('current account authorization', () => {
  const users = {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    findAllActive: jest.fn(),
  };
  const strategy = new JwtStrategy(
    new ConfigService({ JWT_SECRET: 'test-only-secret' }),
    users,
  );
  beforeEach(() => jest.clearAllMocks());
  it('reads current DB role rather than trusting old token role', async () => {
    users.findByUserId.mockResolvedValue(
      Object.assign(new User(), {
        userId: 'uuid',
        userStatus: UserStatus.ACTIVE,
        userRole: UserRole.ADMIN,
      }),
    );
    await expect(
      strategy.validate({ sub: 'uuid', type: 'access' }),
    ).resolves.toEqual({ userId: 'uuid', role: 'admin' });
  });
  it('rejects deleted or suspended users', async () => {
    users.findByUserId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ userStatus: UserStatus.SUSPENDED });
    await expect(
      strategy.validate({ sub: 'uuid', type: 'access' }),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      strategy.validate({ sub: 'uuid', type: 'access' }),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('rejects refresh tokens as API credentials', async () => {
    await expect(
      strategy.validate({ sub: 'uuid', type: 'refresh' }),
    ).rejects.toMatchObject({ status: 401 });
    expect(users.findByUserId).not.toHaveBeenCalled();
  });
});
