import { AI_CONSENT_VERSION } from 'src/user/domain/ai-consent';
jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => undefined,
}));
import { AnalysisService } from './analysis.service';
import { UserStatus } from 'src/user/domain/enum/user-status.enum';
import { UserRepository } from 'src/user/domain/repository/user.repository';
import { UserSummaryRepository } from 'src/user/domain/repository/user-summary.repository';
import { UserSummary } from 'src/user/domain/model/user-summary.entity';
import { UserPhilosopherCountRepository } from 'src/philosopher/domain/repository/user-philosopher-count.repository';
import { Philosopher } from 'src/philosopher/domain/model/philosopher.entity';
import { Repository } from 'typeorm';
import { AnswerContext } from '../domain/repository/analysis-source.repository';

describe('AnalysisService', () => {
  let service: AnalysisService;
  let consent: string | null;
  let summary: UserSummary | null;
  let contexts: AnswerContext[];
  let counts: { philosopherId: string; count: number }[];
  const ai = { analyze: jest.fn() };
  const result = {
    overallSummaries: [
      { title: '기준', summary: '해설', userAnswerIds: ['0'] },
    ],
    contradictions: [{ title: '긴장', summary: '해설', userAnswerIds: ['0'] }],
  };
  beforeEach(() => {
    jest.clearAllMocks();
    summary = null;
    consent = AI_CONSENT_VERSION;
    contexts = Array.from({ length: 5 }, (_, i) => ({
      userAnswerId: String(i),
      questionId: String(i),
      question: '질문',
      answer: '답',
      followupQuestion: null,
      followupAnswer: null,
    }));
    counts = [{ philosopherId: '1', count: 5 }];
    ai.analyze.mockResolvedValue(result);
    const summaries = {
      ensureSnapshot: jest
        .fn()
        .mockImplementation(
          (
            userId: string,
            nearestId: string,
            fingerprint: string,
            accuracy: number,
          ) => {
            if (!summary || summary.sourceFingerprint !== fingerprint)
              summary = Object.assign(new UserSummary(), {
                userId,
                nearestPhilosopherId: nearestId,
                sourceFingerprint: fingerprint,
                accuracy,
                status: 'pending',
                overallSummaries: [],
                contradictions: [],
              });
            return Promise.resolve(summary);
          },
        ),
      claim: jest
        .fn()
        .mockImplementation(
          (_u: string, _f: string, token: string, now: Date) => {
            if (summary?.status === 'ready' || summary?.status === 'processing')
              return Promise.resolve(false);
            Object.assign(summary!, {
              status: 'processing',
              generationToken: token,
              generationStartedAt: now,
            });
            return Promise.resolve(true);
          },
        ),
      finish: jest
        .fn()
        .mockImplementation(
          (
            _u: string,
            fingerprint: string,
            token: string,
            r: typeof result | null,
          ) => {
            if (
              summary?.sourceFingerprint !== fingerprint ||
              summary?.generationToken !== token
            )
              return Promise.resolve(false);
            Object.assign(summary, {
              status: r ? 'ready' : 'failed',
              generationToken: null,
              ...(r ?? {}),
            });
            return Promise.resolve(true);
          },
        ),
    };
    service = new AnalysisService(
      {
        findByUserId: jest.fn().mockImplementation(() =>
          Promise.resolve({
            id: '1',
            userStatus: UserStatus.ACTIVE,
            aiConsentVersion: consent,
          }),
        ),
      } as unknown as UserRepository,
      {
        findByUserId: jest
          .fn()
          .mockImplementation(() => Promise.resolve(counts)),
      } as unknown as UserPhilosopherCountRepository,
      summaries as unknown as UserSummaryRepository,
      ai,
      {
        findContexts: jest
          .fn()
          .mockImplementation(() => Promise.resolve(contexts)),
      },
      {
        findBy: jest.fn().mockImplementation(() =>
          Promise.resolve(
            counts.map((c) => ({
              id: c.philosopherId,
              name: '철학자' + c.philosopherId,
            })),
          ),
        ),
      } as unknown as Repository<Philosopher>,
    );
  });
  it('does not call AI or claim quota without current consent, including after withdrawal', async () => {
    consent = null;
    await expect(service.analyzeContradiction('u')).rejects.toMatchObject({
      response: { code: 'AI_CONSENT_REQUIRED' },
    });
    expect(ai.analyze).not.toHaveBeenCalled();
    consent = 'old-version';
    await expect(service.analyzeContradiction('u')).rejects.toMatchObject({
      response: { code: 'AI_CONSENT_REQUIRED' },
    });
    expect(ai.analyze).not.toHaveBeenCalled();
  });
  it('uses answer count rather than dominant philosopher percentage, with a 100 cap', async () => {
    expect(await service.getAnalysis('u')).toMatchObject({
      accuracy: 16,
      answeredCount: 5,
      composition: [{ percent: 100 }],
    });
    contexts = Array.from({ length: 40 }, (_, i) => ({
      ...contexts[0],
      questionId: String(i),
    }));
    expect((await service.getAnalysis('u')).accuracy).toBe(100);
    expect(ai.analyze).not.toHaveBeenCalled();
  });
  it('rounds composition to 100 and deterministically resolves ties', async () => {
    counts = [
      { philosopherId: '3', count: 1 },
      { philosopherId: '2', count: 1 },
      { philosopherId: '1', count: 1 },
    ];
    const r = await service.getAnalysis('u');
    expect(r.nearestPhilosopherId).toBe('1');
    expect(r.composition.map((c) => c.percent)).toEqual([33.4, 33.3, 33.3]);
  });
  it('returns an empty state before answers and rejects generation', async () => {
    contexts = [];
    counts = [];
    expect(await service.getAnalysis('u')).toMatchObject({
      accuracy: 0,
      composition: [],
      nearestPhilosopherId: null,
    });
    await expect(service.analyzeContradiction('u')).rejects.toThrow();
  });
  it('creates a pending placeholder without AI and generates a first-answer-only summary', async () => {
    expect(await service.getContradiction('u')).toMatchObject({
      status: 'pending',
      canRetry: true,
    });
    expect(ai.analyze).not.toHaveBeenCalled();
    expect(await service.analyzeContradiction('u')).toMatchObject({
      status: 'ready',
      contradictions: [],
      accuracy: 16,
    });
    await service.analyzeContradiction('u');
    expect(ai.analyze).toHaveBeenCalledTimes(1);
  });
  it('retains ratios on AI failure and permits retry', async () => {
    ai.analyze.mockRejectedValueOnce(new Error('upstream'));
    expect(await service.analyzeContradiction('u')).toMatchObject({
      status: 'failed',
      canRetry: true,
    });
    expect((await service.getAnalysis('u')).composition).toHaveLength(1);
    expect(await service.analyzeContradiction('u')).toMatchObject({
      status: 'ready',
    });
  });
  it('includes paired question/first/followup context and invalidates old summaries on content edits', async () => {
    contexts[0].followupQuestion = '후속 질문';
    contexts[0].followupAnswer = '후속 답';
    expect(await service.analyzeContradiction('u')).toMatchObject({
      contradictions: result.contradictions,
    });
    expect(ai.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        answers: expect.arrayContaining([
          expect.stringContaining('후속 답'),
        ]) as unknown,
      }),
    );
    contexts[0].question = '수정된 질문';
    expect(await service.getContradiction('u')).toMatchObject({
      status: 'pending',
      overallSummaries: [],
    });
  });
  it('rejects evidence IDs that do not belong to this user', async () => {
    ai.analyze.mockResolvedValueOnce({
      overallSummaries: [
        {
          title: '잘못된 근거',
          summary: '내용',
          userAnswerIds: ['another-users-answer'],
        },
      ],
      contradictions: [],
    });
    expect(await service.analyzeContradiction('u')).toMatchObject({
      status: 'failed',
      overallSummaries: [],
    });
  });
  it('does not publish an old response after a new answer snapshot is prepared', async () => {
    let release!: (value: typeof result) => void;
    ai.analyze.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const old = service.analyzeContradiction('u');
    for (let i = 0; i < 40 && !release; i++) await Promise.resolve();
    contexts = [
      ...contexts,
      { ...contexts[0], userAnswerId: '6', questionId: '6' },
    ];
    await service.getContradiction('u');
    release(result);
    expect(await old).toMatchObject({
      status: 'pending',
      overallSummaries: [],
    });
  });
  it('does not start a second AI request while generation is in flight', async () => {
    let release!: (value: typeof result) => void;
    ai.analyze.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const first = service.analyzeContradiction('u');
    for (let i = 0; i < 30 && !release; i++) await Promise.resolve();
    expect(await service.analyzeContradiction('u')).toMatchObject({
      status: 'processing',
    });
    release(result);
    await first;
    expect(ai.analyze).toHaveBeenCalledTimes(1);
  });
});
