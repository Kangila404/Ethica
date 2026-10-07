import { ConfigService } from '@nestjs/config';
import { OpenAiAnalysisAiClient } from './openai-analysis-ai.client';
const create = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ responses: { create } })),
}));
const input = {
  answers: ['question and answer'],
  nearestPhilosopher: '칸트',
  philosopherComposition: ['칸트: 100%'],
};
const insights = Array.from({ length: 3 }, () => ({
  title: '제목',
  summary: '내용',
  userAnswerIds: ['1'],
}));
describe('AI structured response handling', () => {
  beforeEach(() => create.mockReset());
  it('accepts an empty contradiction list and does not request an AI accuracy estimate', async () => {
    create.mockResolvedValue({
      status: 'completed',
      output_text: JSON.stringify({
        overallSummaries: insights,
        contradictions: [],
      }),
    });
    const client = new OpenAiAnalysisAiClient(
      new ConfigService({ OPENAI_API_KEY: 'test-only' }),
    );
    expect(await client.analyze(input)).toEqual({
      overallSummaries: insights,
      contradictions: [],
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ store: false }),
      expect.objectContaining({ maxRetries: 0 }),
    );
  });
  it.each([
    'not json',
    JSON.stringify({ overallSummaries: [null], contradictions: [] }),
    JSON.stringify({ overallSummaries: insights, contradictions: [null] }),
  ])('rejects malformed responses', async (output_text) => {
    create.mockResolvedValue({ status: 'completed', output_text });
    await expect(
      new OpenAiAnalysisAiClient(
        new ConfigService({ OPENAI_API_KEY: 'test-only' }),
      ).analyze(input),
    ).rejects.toThrow();
  });
  it('rejects incomplete output', async () => {
    create.mockResolvedValue({ status: 'incomplete', output_text: '{}' });
    await expect(
      new OpenAiAnalysisAiClient(
        new ConfigService({ OPENAI_API_KEY: 'test-only' }),
      ).analyze(input),
    ).rejects.toThrow();
  });
  it('allows construction without a key, but generation fails rather than inventing a summary', async () => {
    const client = new OpenAiAnalysisAiClient(new ConfigService());
    await expect(client.analyze(input)).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});
