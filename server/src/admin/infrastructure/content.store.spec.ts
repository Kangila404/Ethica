jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => undefined,
}));
import { DataSource } from 'typeorm';
import { SqlContentStore } from './content.store';
import { Post } from 'src/philosopher/domain/model/post.entity';
import {
  PostSegment,
  PostSegmentType,
} from 'src/philosopher/domain/model/post-segment.entity';
import { Philosopher } from 'src/philosopher/domain/model/philosopher.entity';
import { ContentStatus } from 'src/common/content-status';
import { PostInput } from '../presentation/content.dto';

describe('editorial post with cards', () => {
  let store: SqlContentStore;
  let post: Post;
  let cards: Partial<PostSegment>[];
  let writes: string[];
  beforeEach(() => {
    writes = [];
    post = Object.assign(new Post(), {
      id: '10',
      title: 'Before',
      philosopherId: '1',
      status: ContentStatus.DRAFT,
    });
    cards = [
      {
        id: '20',
        postId: '10',
        segmentType: PostSegmentType.TEXT,
        body: 'Old',
        sortOrder: 0,
      },
      {
        id: '21',
        postId: '10',
        segmentType: PostSegmentType.TEXT,
        body: 'Remove me',
        sortOrder: 1,
      },
    ];
    store = new SqlContentStore({
      getRepository: (entity: unknown) => {
        if (entity === Philosopher)
          return { findOne: () => Promise.resolve({ id: '1' }) };
        if (entity === Post)
          return {
            create: () => new Post(),
            findOne: (options: { relations?: unknown }) =>
              Promise.resolve(
                options.relations ? { ...post, segments: cards } : post,
              ),
            save: (value: Post) => {
              writes.push('post');
              post = Object.assign(new Post(), value, { id: value.id ?? '10' });
              return Promise.resolve(post);
            },
          };
        if (entity === PostSegment)
          return {
            findBy: () => Promise.resolve(cards),
            delete: (id: string) => {
              writes.push('delete');
              cards = cards.filter((c) => c.id !== id);
              return Promise.resolve();
            },
            save: (card: Partial<PostSegment>) => {
              writes.push('card');
              cards = [
                ...cards.filter((c) => !card.id || c.id !== card.id),
                { ...card, id: card.id ?? '22' },
              ];
              return Promise.resolve();
            },
          };
        throw new Error('Unexpected repository');
      },
    } as unknown as DataSource);
  });
  function save(input: PostInput, id = '10') {
    return store.save('posts', input, id);
  }
  it('saves metadata, edits, additions, deletions and order as one aggregate', async () => {
    const result = (await save({
      title: 'After',
      philosopherId: '1',
      status: ContentStatus.PUBLISHED,
      segments: [
        { segmentType: PostSegmentType.TEXT, body: 'New first card' },
        {
          id: '20',
          segmentType: PostSegmentType.TEXT,
          body: 'Edited second card',
        },
      ],
    })) as Post;
    expect(result.title).toBe('After');
    expect(result.status).toBe(ContentStatus.PUBLISHED);
    expect(result.segments.map((c) => [c.body, c.sortOrder])).toEqual([
      ['New first card', 0],
      ['Edited second card', 1],
    ]);
    expect(result.segments.map((c) => c.id)).not.toContain('21');
  });
  it('rejects another post card ID and duplicate IDs before writing', async () => {
    for (const ids of [['999'], ['20', '20']]) {
      await expect(
        save({
          title: 'After',
          philosopherId: '1',
          segments: ids.map((id) => ({
            id,
            segmentType: PostSegmentType.TEXT,
            body: 'Text',
          })),
        }),
      ).rejects.toThrow('게시글에 속한');
    }
    expect(writes).toEqual([]);
  });
  it('rejects empty public posts and malformed cards before writing', async () => {
    await expect(
      save({
        title: 'After',
        philosopherId: '1',
        status: ContentStatus.PUBLISHED,
        segments: [],
      }),
    ).rejects.toThrow('학습 카드');
    await expect(
      save({
        title: 'After',
        philosopherId: '1',
        segments: [{ segmentType: PostSegmentType.IMAGE, imageKey: ' ' }],
      }),
    ).rejects.toThrow('내용');
    expect(writes).toEqual([]);
  });
  it('keeps metadata-only edits from deleting existing cards and permits empty drafts', async () => {
    const result = (await save({
      title: 'New title',
      philosopherId: '1',
    })) as Post;
    expect(result.segments).toHaveLength(2);
    expect(writes).toEqual(['post']);
    const empty = (await save({
      title: 'Draft',
      philosopherId: '1',
      status: ContentStatus.DRAFT,
      segments: [],
    })) as Post;
    expect(empty.segments).toHaveLength(0);
  });
});
