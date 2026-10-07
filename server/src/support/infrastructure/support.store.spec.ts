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
    'provides an explicitly versioned %s draft when missing',
    async (type) => {
      repository.findOneBy.mockResolvedValue(null);
      const draft = await store.term(type);
      expect(draft.version).toMatch(/^draft-/);
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
    expect(draft.content).toContain('새로운 계정');
    expect(draft.content).toContain('기존 백업');
  });
});
