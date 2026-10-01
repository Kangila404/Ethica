import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AvatarUpdateRequest, AVATAR_IDS } from './avatar-update-request.dto';
import { NicknameUpdateRequest } from './nicknameUpdate-request.dto';
import { UserResponse } from '../res/user-response.dto';
import { User } from '../../../domain/model/user.entity';

describe('Profile update contract', () => {
  it('accepts only bundled avatar IDs or explicit null', async () => {
    for (const avatarId of [...AVATAR_IDS, null]) {
      expect(
        await validate(plainToInstance(AvatarUpdateRequest, { avatarId })),
      ).toHaveLength(0);
    }
    for (const body of [
      {},
      { avatarId: '' },
      { avatarId: 'https://example.com/photo.png' },
      { avatarId: 1 },
    ]) {
      expect(
        (await validate(plainToInstance(AvatarUpdateRequest, body))).length,
      ).toBeGreaterThan(0);
    }
  });
  it('trims nicknames and rejects empty, non-string and over-limit values', async () => {
    const valid = plainToInstance(NicknameUpdateRequest, {
      name: '  에티카  ',
    });
    expect(valid.name).toBe('에티카');
    expect(await validate(valid)).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(NicknameUpdateRequest, { name: '가'.repeat(50) }),
      ),
    ).toHaveLength(0);
    for (const name of [undefined, null, 7, '', '   ', '가'.repeat(51)]) {
      expect(
        (await validate(plainToInstance(NicknameUpdateRequest, { name })))
          .length,
      ).toBeGreaterThan(0);
    }
  });
  it('returns the saved avatar and uses null for older profiles', () => {
    const user = User.create('에티카');
    expect(UserResponse.from(user).avatarId).toBeNull();
    user.avatarId = 'moon';
    expect(UserResponse.from(user).avatarId).toBe('moon');
  });
});
