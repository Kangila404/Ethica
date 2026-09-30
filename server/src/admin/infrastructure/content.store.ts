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
  QuestionWrite,
} from '../domain/content-store';
import { Category } from 'src/category/domain/model/category.entity';
import { Philosopher } from 'src/philosopher/domain/model/philosopher.entity';
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
  list(kind: ContentKind, after?: string) {
    return this.repo(kind).find({
      where: after ? { id: MoreThan(after) } : {},
      order: { id: 'ASC' },
      take: 50,
    });
  }
  async get(kind: ContentKind, id: string, lock = false) {
    const item = await this.repo(kind).findOne({
      where: { id },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!item) throw new NotFoundException('콘텐츠를 찾을 수 없습니다.');
    return item;
  }
  @Transactional()
  async save(kind: ContentKind, input: Partial<Content>, id?: string) {
    const item = id ? await this.get(kind, id, true) : this.repo(kind).create();
    if (kind === 'posts') {
      const post = input as Partial<Post>;
      await this.get('philosophers', post.philosopherId!, true);
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
  questions(after?: string) {
    return this.db.getRepository(Question).find({
      where: after ? { id: MoreThan(after) } : {},
      order: { id: 'ASC' },
      take: 50,
    });
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
      isActive: input.isActive,
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
