export const ANALYSIS_AI_CLIENT = Symbol('ANALYSIS_AI_CLIENT');

export type AnalysisInsight = {
  title: string;
  summary: string;
  userAnswerIds: string[];
};

export type AnalysisAiResult = {
  overallSummaries: AnalysisInsight[];
  contradictions: AnalysisInsight[];
};

export interface AnalysisAiClient {
  analyze(input: {
    answers: string[];
    nearestPhilosopher: string;
    philosopherComposition: string[];
  }): Promise<AnalysisAiResult>;
}
