export const ANALYSIS_SOURCE_REPOSITORY = Symbol('ANALYSIS_SOURCE_REPOSITORY');
export type AnswerContext = {
  userAnswerId: string;
  questionId: string;
  question: string;
  answer: string;
  followupQuestion: string | null;
  followupAnswer: string | null;
};
export interface AnalysisSourceRepository {
  findContexts(userId: string): Promise<AnswerContext[]>;
}
