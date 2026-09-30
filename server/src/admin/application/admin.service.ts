import { Inject, Injectable } from '@nestjs/common';
import {
  CONTENT_STORE,
  type ContentStore,
  type ContentKind,
  type Content,
  type QuestionWrite,
} from '../domain/content-store';
@Injectable()
export class AdminService {
  constructor(@Inject(CONTENT_STORE) private readonly store: ContentStore) {}
  list(kind: ContentKind, after?: string) {
    return this.store.list(kind, after);
  }
  get(kind: ContentKind, id: string) {
    return this.store.get(kind, id);
  }
  save(kind: ContentKind, input: Partial<Content>, id?: string) {
    return this.store.save(kind, input, id);
  }
  remove(kind: ContentKind, id: string) {
    return this.store.remove(kind, id);
  }
  questions(after?: string) {
    return this.store.questions(after);
  }
  question(id: string) {
    return this.store.question(id);
  }
  saveQuestion(input: QuestionWrite, id?: string) {
    return this.store.saveQuestion(input, id);
  }
  deactivateQuestion(id: string) {
    return this.store.deactivateQuestion(id);
  }
  users(after?: string) {
    return this.store.users(after);
  }
  user(id: string) {
    return this.store.user(id);
  }
}
