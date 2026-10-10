import { QueryRunner } from 'typeorm';
import { PublishLegalDocuments1791597600000 } from './1791597600000-PublishLegalDocuments';
import documents from './content/legal-documents-v1.json';
import bundled from '../../support/legal-drafts.json';

describe('legal document publication', () => {
  const migration = new PublishLegalDocuments1791597600000();
  const makeRunner = () => ({
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue(undefined),
  });
  it('inserts both frozen documents atomically without overwriting existing text', async () => {
    const runner = makeRunner();
    await migration.up(runner as unknown as QueryRunner);
    expect(runner.startTransaction).toHaveBeenCalledTimes(1);
    expect(runner.query).toHaveBeenCalledTimes(2);
    for (const [index, doc] of documents.entries()) {
      expect(runner.query).toHaveBeenNthCalledWith(
        index + 1,
        expect.stringContaining('ON DUPLICATE KEY UPDATE id = id'),
        [doc.type, doc.title, doc.content, doc.version],
      );
    }
    expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(runner.rollbackTransaction).not.toHaveBeenCalled();
  });
  it('rolls back both inserts on failure', async () => {
    const runner = makeRunner();
    runner.query
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('write failed'));
    await expect(
      migration.up(runner as unknown as QueryRunner),
    ).rejects.toThrow('write failed');
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.commitTransaction).not.toHaveBeenCalled();
  });
  it('keeps the iOS/API fallback in sync and discloses actual retention', () => {
    expect(bundled).toEqual(documents);
    expect(documents.map((d) => d.type)).toEqual(['service', 'privacy']);
    for (const doc of documents) {
      expect(doc.version).toBe('2026-10-10');
      expect(doc.content.length).toBeLessThan(10000);
      expect(doc.content).not.toMatch(
        /검토용 초안|운영자 확인 필요|정식 공개 전에/,
      );
    }
    expect(documents[0].content).toContain('로그인 없이 이용하기');
    expect(documents[0].content).toContain('퍼블릭 도메인');
    expect(documents[1].content).toContain('좋아요');
    expect(documents[1].content).toContain('별도 동의를 받은 경우에만');
    expect(documents[1].content).toContain('운영자가 수동 관리');
    expect(documents[1].content).toContain(
      '특정 일수 이내의 자동 삭제를 보장하지 않습니다',
    );
  });
  it('does not remove published terms on rollback', () => {
    expect(() => migration.down()).toThrow('Forward-only');
  });
});
