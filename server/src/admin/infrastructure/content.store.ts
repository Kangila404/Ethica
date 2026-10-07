import { ContentStatus } from 'src/common/content-status';
import type { PostCardInput } from '../presentation/content.dto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityTarget, MoreThan } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import type {
  ContentStore,
  Content,
  ContentKind,
  ContentFilters,
  QuestionWrite,
} from '../domain/content-store';
import { Category } from 'src/category/domain/model/category.entity';
import { Philosopher } from 'src/philosopher/domain/model/philosopher.entity';
import {
  LearningCategory,
  LearningProfileCategory,
} from 'src/philosopher/domain/model/learning-profile-category.entity';
import { Post } from 'src/philosopher/domain/model/post.entity';
import {
  PostSegment,
  PostSegmentType,
} from 'src/philosopher/domain/model/post-segment.entity';
import { Question } from 'src/question/domain/model/question.entity';
import { QuestionType } from 'src/question/domain/enum/question-type.enum';
import { Answer } from 'src/question/domain/model/answer.entity';
import { FollowupAnswer } from 'src/question/domain/model/followup-answer.entity';
import { QuestionCategory } from 'src/question/domain/model/question-category.entity';
import { User } from 'src/user/domain/model/user.entity';
const targets: Record<ContentKind, EntityTarget<Content>> = {
  categories: Category,
  philosophers: Philosopher,
  posts: Post,
  segments: PostSegment,
};
@Injectable()
export class SqlContentStore implements ContentStore {
  constructor(@InjectDataSource() private readonly db: DataSource) {}
  private repo(kind: ContentKind) {
    return this.db.getRepository(targets[kind]);
  }
  list(kind: ContentKind, after?: string, filters: ContentFilters = {}) {
    const qb = this.repo(kind)
      .createQueryBuilder('item')
      .orderBy('item.id', 'ASC')
      .take(50);
    if (after) qb.andWhere('item.id > :after', { after });
    if (kind === 'posts') {
      if (filters.status)
        qb.andWhere('item.status = :status', { status: filters.status });
      if (filters.search?.trim())
        qb.andWhere('item.title LIKE :search', {
          search: `%${filters.search.trim()}%`,
        });
    }
    return qb.getMany();
  }
  async get(kind: ContentKind, id: string, lock = false) {
    const item = await this.repo(kind).findOne({
      where: { id },
      ...(kind === 'posts' && !lock
        ? {
            relations: { segments: true },
            order: { segments: { sortOrder: 'ASC' as const } },
          }
        : {}),
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!item) throw new NotFoundException('콘텐츠를 찾을 수 없습니다.');
    return item;
  }
  @Transactional()
  async save(kind: ContentKind, input: Partial<Content>, id?: string) {
    const item = id ? await this.get(kind, id, true) : this.repo(kind).create();
    if (kind === 'philosophers') {
      const { categories, ...profile } = input as Partial<Philosopher> & {
        categories?: LearningCategory[];
      };
      Object.assign(item, profile);
      await this.repo(kind).save(item);
      if (categories || !id) {
        const repository = this.db.getRepository(LearningProfileCategory);
        await repository.delete({ philosopherId: item.id });
        await repository.insert(
          (categories ?? [LearningCategory.PHILOSOPHY]).map((category) => ({
            philosopherId: item.id,
            category,
          })),
        );
      }
      return this.get(kind, item.id);
    }
    if (kind === 'posts') {
      const post = input as Partial<Post>;
      await this.get('philosophers', post.philosopherId!, true);
      const cards = (input as { segments?: PostCardInput[] }).segments;
      const segmentRepo = this.db.getRepository(PostSegment);
      const old = id ? await segmentRepo.findBy({ postId: id }) : [];
      if (cards) {
        const ids = cards.flatMap((c) => (c.id ? [c.id] : []));
        if (
          new Set(ids).size !== ids.length ||
          ids.some((key) => !old.some((c) => c.id === key))
        )
          throw new BadRequestException(
            '게시글에 속한 카드만 수정할 수 있습니다.',
          );
        for (const card of cards) {
          if (
            card.segmentType === PostSegmentType.TEXT
              ? !card.body?.trim()
              : !card.imageKey?.trim()
          )
            throw new BadRequestException(
              '카드 타입에 맞는 내용이 필요합니다.',
            );
        }
      }
      const status =
        post.status ?? (item as Post).status ?? ContentStatus.DRAFT;
      if (status === ContentStatus.PUBLISHED && !(cards ?? old).length)
        throw new BadRequestException('공개하려면 학습 카드를 추가해주세요.');
      const metadata = { ...input } as Partial<Post>;
      delete metadata.segments;
      Object.assign(item, metadata, { status });
      await this.repo(kind).save(item);
      if (cards) {
        for (const removed of old.filter(
          (c) => !cards.some((next) => next.id === c.id),
        ))
          await segmentRepo.delete(removed.id);
        for (const [sortOrder, card] of cards.entries())
          await segmentRepo.save({ ...card, postId: item.id, sortOrder });
      }
      return this.get(kind, item.id);
    }
    if (kind === 'segments') {
      const segment = input as Partial<PostSegment>;
      await this.get('posts', segment.postId!, true);
      if (
        (segment.segmentType === PostSegmentType.TEXT &&
          !segment.body?.trim()) ||
        (segment.segmentType === PostSegmentType.IMAGE &&
          !segment.imageKey?.trim())
      )
        throw new BadRequestException('카드 타입에 맞는 내용이 필요합니다.');
    }
    Object.assign(item, input);
    return this.repo(kind).save(item);
  }
  @Transactional()
  async remove(kind: ContentKind, id: string): Promise<void> {
    await this.get(kind, id, true);
    if (
      kind === 'categories' &&
      ((await this.db
        .getRepository(QuestionCategory)
        .countBy({ categoryId: id })) ||
        (await this.db.getRepository(User).countBy({ interestCategoryId: id })))
    )
      throw new ConflictException('사용 중인 카테고리는 삭제할 수 없습니다.');
    if (
      kind === 'philosophers' &&
      ((await this.db.getRepository(Answer).countBy({ philosopherId: id })) ||
        (await this.db.getRepository(Post).countBy({ philosopherId: id })))
    )
      throw new ConflictException(
        '문제 또는 게시물에 연결된 사상가는 삭제할 수 없습니다.',
      );
    await this.repo(kind).delete(id);
  }
  questions(after?: string, filters: ContentFilters = {}) {
    const qb = this.db
      .getRepository(Question)
      .createQueryBuilder('q')
      .orderBy('q.id', 'ASC')
      .take(50);
    if (after) qb.andWhere('q.id > :after', { after });
    if (filters.status)
      qb.andWhere('q.status = :status', { status: filters.status });
    if (filters.usage)
      qb.andWhere('q.usage = :usage', { usage: filters.usage });
    if (filters.categoryId)
      qb.innerJoin(
        'q.categories',
        'category',
        'category.categoryId = :categoryId',
        { categoryId: filters.categoryId },
      );
    if (filters.search?.trim())
      qb.andWhere('(q.title LIKE :search OR q.stage1Body LIKE :search)', {
        search: `%${filters.search.trim()}%`,
      });
    return qb.getMany();
  }
  async question(id: string): Promise<Question> {
    const q = await this.db.getRepository(Question).findOne({
      where: { id },
      relations: { answers: true, followupAnswers: true, categories: true },
      order: { answers: { id: 'ASC' }, followupAnswers: { id: 'ASC' } },
    });
    if (!q) throw new NotFoundException('문제를 찾을 수 없습니다.');
    return q;
  }
  @Transactional()
  async saveQuestion(input: QuestionWrite, id?: string): Promise<Question> {
    const repo = this.db.getRepository(Question);
    const q = id
      ? await repo.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        })
      : repo.create();
    if (!q) throw new NotFoundException('문제를 찾을 수 없습니다.');
    if (id && (q.type !== input.type || q.usage !== input.usage))
      throw new ConflictException(
        '문제 타입과 용도 변경은 새 문제로 등록해주세요.',
      );
    if (
      input.type === QuestionType.TWO_STAGE
        ? !input.followupBody?.trim() || input.followupAnswers.length !== 2
        : input.followupAnswers.length !== 0 || !!input.followupBody
    )
      throw new BadRequestException('문제 타입과 후속 질문 구성이 다릅니다.');
    for (const categoryId of input.categoryIds)
      await this.get('categories', categoryId, true);
    for (const answer of input.answers)
      await this.get('philosophers', answer.philosopherId, true);
    const oldAnswers = id
      ? await this.db.getRepository(Answer).findBy({ questionId: id })
      : [];
    const oldFollowups = id
      ? await this.db.getRepository(FollowupAnswer).findBy({ questionId: id })
      : [];
    for (const [choices, old] of [
      [input.answers, oldAnswers],
      [input.followupAnswers, oldFollowups],
    ] as const) {
      if (
        id
          ? choices
              .map((c: { id?: string }) => c.id)
              .sort()
              .join(',') !==
            old
              .map((c: { id?: string }) => c.id)
              .sort()
              .join(',')
          : choices.some((c) => c.id)
      )
        throw new ConflictException(
          '수정 시 기존 선택지 ID를 그대로 사용해야 합니다.',
        );
    }
    Object.assign(q, {
      usage: input.usage,
      type: input.type,
      title: input.title,
      stage1Body: input.stage1Body,
      followupBody: input.followupBody ?? null,
      imageKey: input.imageKey ?? null,
      status:
        input.status ??
        (input.isActive === undefined
          ? (q.status ?? ContentStatus.DRAFT)
          : input.isActive
            ? ContentStatus.PUBLISHED
            : ContentStatus.HELD),
      isActive:
        (input.status ??
          (input.isActive === undefined
            ? (q.status ?? ContentStatus.DRAFT)
            : input.isActive
              ? ContentStatus.PUBLISHED
              : ContentStatus.HELD)) === ContentStatus.PUBLISHED,
    });
    await repo.save(q);
    for (const choice of input.answers) {
      const old = oldAnswers.find((a) => a.id === choice.id);
      if (old && old.philosopherId !== choice.philosopherId) {
        // Question-row locking also surrounds answer submissions. Transfer only
        // this choice's contributions with atomic arithmetic, preserving other questions.
        const rows = await this.db.query<{ userId: string; amount: string }[]>(
          'SELECT userId, COUNT(*) AS amount FROM user_answer WHERE answerId = ? GROUP BY userId',
          [old.id],
        );
        for (const row of rows) {
          const owner = await this.db.getRepository(User).findOne({
            where: { id: row.userId },
            withDeleted: true,
            lock: { mode: 'pessimistic_write' },
          });
          if (!owner) continue;
          await this.db.query(
            'UPDATE user_philosopher_count SET count = count - ? WHERE user_id = ? AND philosopher_id = ?',
            [Number(row.amount), row.userId, old.philosopherId],
          );
          await this.db.query(
            'INSERT INTO user_philosopher_count (user_id, philosopher_id, count) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE count = count + VALUES(count)',
            [row.userId, choice.philosopherId, Number(row.amount)],
          );
          await this.db.query(
            'DELETE FROM user_philosopher_count WHERE user_id = ? AND philosopher_id = ? AND count = 0',
            [row.userId, old.philosopherId],
          );
        }
      }
      await this.db.getRepository(Answer).save({ ...choice, questionId: q.id });
    }
    for (const choice of input.followupAnswers)
      await this.db
        .getRepository(FollowupAnswer)
        .save({ ...choice, questionId: q.id, question: q });
    await this.db.getRepository(QuestionCategory).delete({ questionId: q.id });
    await this.db.getRepository(QuestionCategory).save(
      input.categoryIds.map((categoryId) => ({
        questionId: q.id,
        categoryId,
      })),
    );
    return this.question(q.id);
  }
  @Transactional()
  async deactivateQuestion(id: string) {
    const q = await this.db
      .getRepository(Question)
      .findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!q) throw new NotFoundException('문제를 찾을 수 없습니다.');
    q.isActive = false;
    q.status = ContentStatus.HELD;
    await this.db.getRepository(Question).save(q);
  }
  async users(after?: string) {
    const rows = await this.db.getRepository(User).find({
      where: after ? { id: MoreThan(after) } : {},
      withDeleted: true,
      order: { id: 'ASC' },
      take: 50,
      select: {
        id: true,
        userId: true,
        name: true,
        userRole: true,
        userStatus: true,
        onboardingStatus: true,
        deletedAt: true,
      },
    });
    return rows.map(({ id, ...user }) => ({ ...user, cursor: id }));
  }
  async user(userId: string) {
    const user = await this.db.getRepository(User).findOne({
      where: { userId },
      withDeleted: true,
      select: {
        userId: true,
        name: true,
        userRole: true,
        userStatus: true,
        onboardingStatus: true,
        createdAt: true,
        deletedAt: true,
      },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }
}
