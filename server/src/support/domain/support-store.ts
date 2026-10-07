import { Inquiry } from './model/inquiry.entity';
import { Notice } from './model/notice.entity';
import { Term } from './model/term.entity';
export const SUPPORT_STORE = Symbol('SUPPORT_STORE');
export interface SupportStore {
  inquiries(userId?: string, after?: string): Promise<Inquiry[]>;
  inquiry(id: string, userId?: string): Promise<Inquiry>;
  createInquiry(
    userId: string,
    title: string,
    content: string,
  ): Promise<Inquiry>;
  answerInquiry(
    id: string,
    adminId: string,
    answerContent: string,
  ): Promise<Inquiry>;
  notices(admin: boolean, after?: string): Promise<Notice[]>;
  notice(id: string, admin: boolean): Promise<Notice>;
  saveNotice(
    adminId: string,
    input: Pick<Notice, 'title' | 'content' | 'isPublished'>,
    id?: string,
  ): Promise<Notice>;
  deleteNotice(id: string): Promise<void>;
  term(type: string): Promise<Term>;
  saveTerm(
    input: Pick<Term, 'type' | 'title' | 'content' | 'version'>,
  ): Promise<Term>;
}
