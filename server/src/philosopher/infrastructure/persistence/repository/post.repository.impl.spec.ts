import { Repository } from 'typeorm';
import { Post } from 'src/philosopher/domain/model/post.entity';
import { PostRepositoryImpl } from './post.repository.impl';
describe('public learning visibility', () => {
  it('excludes unpublished posts from direct access, lists and catalog counts', async () => {
    const orm = { findOne: jest.fn(), find: jest.fn(), count: jest.fn() };
    const repository = new PostRepositoryImpl(
      orm as unknown as Repository<Post>,
    );
    await repository.findById('10');
    await repository.findByPhilosopherId('1');
    await repository.countByPhilosopherId('1');
    expect(orm.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: '10', status: 'published' } }),
    );
    for (const fn of [orm.find, orm.count])
      expect(fn).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { philosopherId: '1', status: 'published' },
        }),
      );
  });
});
