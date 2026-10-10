import { DataSource } from 'typeorm';
import { SqlSupportStore } from './support.store';

describe('legal document fallback', () => {
  const repository = {
    findOneBy: jest.fn(),
    create: jest.fn((value: unknown) => value),
  };
  const store = new SqlSupportStore({
    getRepository: () => repository,
  } as unknown as DataSource);
  beforeEach(() => jest.clearAllMocks());
  it('preserves the operator-published document', async () => {
    const published = {
      type: 'privacy',
      version: '1.0',
      title: 'Policy',
      content: 'Approved text',
    };
    repository.findOneBy.mockResolvedValue(published);
    expect(await store.term('privacy')).toBe(published);
    expect(repository.create).not.toHaveBeenCalled();
  });
  it.each(['service', 'privacy'])(
    'provides a dated published %s document when missing',
    async (type) => {
      repository.findOneBy.mockResolvedValue(null);
      const draft = await store.term(type);
      expect(draft.version).toBe('2026-10-10');
      expect(draft.content).not.toMatch(
        /검토용 초안|정식 공개 전에|운영자 확인 필요/,
      );
      expect(draft.content).toContain('강일아');
      expect(draft.content).toContain('ia3264666@gmail.com');
    },
  );
  it('rejects an unknown document type', async () => {
    repository.findOneBy.mockResolvedValue(null);
    await expect(store.term('unknown')).rejects.toThrow();
  });
  it('describes clean re-registration and distinguishes live deletion from backup retention', async () => {
    repository.findOneBy.mockResolvedValue(null);
    const draft = await store.term('privacy');
    expect(draft.content).not.toContain('2년');
    expect(draft.content).toContain(
      '재가입 시 삭제된 개인 기록을 복원하지 않습니다',
    );
    expect(draft.content).toContain(
      '고정 보관기간이나 자동 만료·삭제 작업이 설정되어 있지 않고',
    );
    expect(draft.content).toContain('운영자가 수동 관리');
    expect(draft.content).toContain(
      '자동으로 다시 삭제하는 기능도 현재 구현되어 있지 않습니다',
    );
  });
});
