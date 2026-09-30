import { Inquiry } from '../domain/model/inquiry.entity';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SUPPORT_STORE, type SupportStore } from '../domain/support-store';
import {
  USER_REPOSITORY,
  type UserRepository,
} from 'src/user/domain/repository/user.repository';
import { Notice } from '../domain/model/notice.entity';
import { Term } from '../domain/model/term.entity';
@Injectable()
export class SupportService {
  constructor(
    @Inject(SUPPORT_STORE) private readonly store: SupportStore,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}
  private inquiryView(item: Inquiry) {
    return {
      id: item.id,
      title: item.title,
      content: item.content,
      status: item.status,
      answerContent: item.answerContent,
      answeredAt: item.answeredAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
  private noticeView(item: Notice) {
    return {
      id: item.id,
      title: item.title,
      content: item.content,
      isPublished: item.isPublished,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
  private async internalId(userId: string) {
    const user = await this.users.findByUserId(userId);
    if (!user) throw new NotFoundException();
    return user.id;
  }
  async inquiries(userId?: string, after?: string) {
    return (
      await this.store.inquiries(
        userId ? await this.internalId(userId) : undefined,
        after,
      )
    ).map((item) => this.inquiryView(item));
  }
  async inquiry(id: string, userId?: string) {
    return this.inquiryView(
      await this.store.inquiry(
        id,
        userId ? await this.internalId(userId) : undefined,
      ),
    );
  }
  async create(userId: string, title: string, content: string) {
    return this.inquiryView(
      await this.store.createInquiry(
        await this.internalId(userId),
        title,
        content,
      ),
    );
  }
  async answer(id: string, adminId: string, body: string) {
    return this.inquiryView(
      await this.store.answerInquiry(id, await this.internalId(adminId), body),
    );
  }
  async notices(admin: boolean, after?: string) {
    return (await this.store.notices(admin, after)).map((item) =>
      this.noticeView(item),
    );
  }
  async notice(id: string, admin: boolean) {
    return this.noticeView(await this.store.notice(id, admin));
  }
  async saveNotice(
    adminId: string,
    input: Pick<Notice, 'title' | 'content' | 'isPublished'>,
    id?: string,
  ) {
    return this.noticeView(
      await this.store.saveNotice(await this.internalId(adminId), input, id),
    );
  }
  deleteNotice(id: string) {
    return this.store.deleteNotice(id);
  }
  term(type: string) {
    return this.store.term(type);
  }
  saveTerm(input: Pick<Term, 'type' | 'title' | 'content' | 'version'>) {
    return this.store.saveTerm(input);
  }
}
