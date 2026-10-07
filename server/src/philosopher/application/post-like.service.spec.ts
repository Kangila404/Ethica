import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PostLikeService } from './post-like.service';
import type { PostRepository } from '../domain/repository/post.repository';
import type { UserRepository } from 'src/user/domain/repository/user.repository';

describe('Learning likes', () => {
  const likes = { state: jest.fn(), set: jest.fn() };
  const posts = { findById: jest.fn() };
  const users = { findByUserId: jest.fn() };
  const service = new PostLikeService(
    likes,
    posts as unknown as PostRepository,
    users as unknown as UserRepository,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    posts.findById.mockResolvedValue({ id: '2' });
    users.findByUserId.mockResolvedValue({ id: '9', userStatus: 'active' });
    likes.state.mockResolvedValue({ count: 3, liked: false });
  });
  it('exposes counts without looking up an anonymous user', async () => {
    await expect(service.state('2')).resolves.toEqual({
      count: 3,
      liked: false,
    });
    expect(users.findByUserId).not.toHaveBeenCalled();
    expect(likes.state).toHaveBeenCalledWith('2', undefined);
  });
  it('does not disclose counts or accept likes on hidden/missing posts', async () => {
    posts.findById.mockResolvedValue(null);
    await expect(service.state('2')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.set('2', 'uuid', true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(likes.state).not.toHaveBeenCalled();
    expect(likes.set).not.toHaveBeenCalled();
  });
  it('resolves the actor from the verified UUID, never a client-supplied DB ID', async () => {
    await service.set('2', 'uuid', true);
    expect(users.findByUserId).toHaveBeenCalledWith('uuid');
    expect(likes.set).toHaveBeenCalledWith('2', '9', true);
  });
  it('rejects suspended or deleted accounts', async () => {
    users.findByUserId.mockResolvedValue({ id: '9', userStatus: 'suspended' });
    await expect(service.set('2', 'uuid', true)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(likes.set).not.toHaveBeenCalled();
  });
});
