import { PhilosopherService } from './philosopher.service';
import type { PostRepository } from '../domain/repository/post.repository';
import type { PostSegmentRepository } from '../domain/repository/post-segment.repository';
import type { PhilosopherRepository } from '../domain/repository/philosopher.repository';
import type { UserPhilosopherCountRepository } from '../domain/repository/user-philosopher-count.repository';
import type { UserRepository } from 'src/user/domain/repository/user.repository';

describe('Public learning', () => {
  it('returns published counts and categories, but no personalized composition for guests', async () => {
    const users = { findByUserId: jest.fn() };
    const counts = { findByUserId: jest.fn() };
    const service = new PhilosopherService(
      {} as PostSegmentRepository,
      {
        countByPhilosopherId: jest.fn().mockResolvedValue(2),
      } as unknown as PostRepository,
      {
        findAll: jest.fn().mockResolvedValue([
          {
            id: '1',
            name: '작가',
            learningCategories: [{ category: 'literature' }],
          },
        ]),
      } as unknown as PhilosopherRepository,
      users as unknown as UserRepository,
      counts as unknown as UserPhilosopherCountRepository,
    );
    const result = await service.getPhilosophers();
    expect(result.nearest).toEqual([]);
    expect(result.all[0]).toMatchObject({
      id: '1',
      postCount: 2,
      categories: ['literature'],
    });
    expect(users.findByUserId).not.toHaveBeenCalled();
    expect(counts.findByUserId).not.toHaveBeenCalled();
  });
});
