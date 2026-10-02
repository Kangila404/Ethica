import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MoreThan } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { Inquiry } from '../domain/model/inquiry.entity';
import { Notice } from '../domain/model/notice.entity';
import { Term } from '../domain/model/term.entity';
import { SupportStore } from '../domain/support-store';
import legalDrafts from '../legal-drafts.json';
@Injectable()
export class SqlSupportStore implements SupportStore {
  constructor(@InjectDataSource() private readonly db: DataSource) {}
  inquiries(userId?: string, after?: string) {
    return this.db.getRepository(Inquiry).find({
      where: {
        ...(userId ? { userId } : {}),
        ...(after ? { id: MoreThan(after) } : {}),
      },
      order: { id: 'ASC' },
      take: 50,
    });
  }
  async inquiry(id: string, userId?: string) {
    const item = await this.db
      .getRepository(Inquiry)
      .findOneBy({ id, ...(userId ? { userId } : {}) });
    if (!item) throw new NotFoundException('문의를 찾을 수 없습니다.');
    return item;
  }
  createInquiry(userId: string, title: string, content: string) {
    return this.db.getRepository(Inquiry).save({ userId, title, content });
  }
  async answerInquiry(id: string, adminId: string, answerContent: string) {
    await this.inquiry(id);
    await this.db.getRepository(Inquiry).update(id, {
      answerContent,
      answeredBy: adminId,
      answeredAt: new Date(),
      status: 'answered',
    });
    return this.inquiry(id);
  }
  notices(admin: boolean, after?: string) {
    return this.db.getRepository(Notice).find({
      where: {
        ...(admin ? {} : { isPublished: true }),
        ...(after ? { id: MoreThan(after) } : {}),
      },
      order: { id: 'ASC' },
      take: 50,
    });
  }
  async notice(id: string, admin: boolean) {
    const item = await this.db
      .getRepository(Notice)
      .findOneBy({ id, ...(admin ? {} : { isPublished: true }) });
    if (!item) throw new NotFoundException('공지를 찾을 수 없습니다.');
    return item;
  }
  async saveNotice(
    adminId: string,
    input: Pick<Notice, 'title' | 'content' | 'isPublished'>,
    id?: string,
  ) {
    if (id) await this.notice(id, true);
    return this.db
      .getRepository(Notice)
      .save({ ...input, ...(id ? { id } : {}), authorId: adminId });
  }
  async deleteNotice(id: string) {
    await this.notice(id, true);
    await this.db.getRepository(Notice).delete(id);
  }
  async term(type: string) {
    const item = await this.db.getRepository(Term).findOneBy({ type });
    if (item) return item;
    const draft = legalDrafts.find((document) => document.type === type);
    if (!draft) throw new NotFoundException('등록된 약관이 없습니다.');
    // Never replace operator-authored terms. Missing documents expose a labeled draft only.
    return this.db.getRepository(Term).create(draft);
  }
  @Transactional()
  async saveTerm(input: Pick<Term, 'type' | 'title' | 'content' | 'version'>) {
    await this.db.getRepository(Term).upsert(input, ['type']);
    return this.term(input.type);
  }
}
