import { Philosopher } from 'src/philosopher/domain/model/philosopher.entity';
import { UserSummary } from 'src/user/domain/model/user-summary.entity';
import { UserSummaryInsight } from 'src/user/domain/model/user-summary.entity';

class AnalysisAccordionItem {
  title!: string;
  summary!: string;

  static from(insight: UserSummaryInsight): AnalysisAccordionItem {
    const dto = new AnalysisAccordionItem();
    dto.title = insight.title;
    dto.summary = insight.summary;
    return dto;
  }
}

export class ContradictionResponse {
  nearestPhilosopherId!: string;
  nearestPhilosopherName!: string;
  overallSummaries!: AnalysisAccordionItem[];
  contradictions!: AnalysisAccordionItem[];
  accuracy!: number;
  accuracyDescription!: string;

  static from(
    userSummary: UserSummary,
    nearestPhilosopher: Philosopher,
  ): ContradictionResponse {
    const dto = new ContradictionResponse();
    dto.nearestPhilosopherId = nearestPhilosopher.id;
    dto.nearestPhilosopherName = nearestPhilosopher.name;
    dto.overallSummaries = userSummary.overallSummaries.map((item) =>
      AnalysisAccordionItem.from(item),
    );
    dto.contradictions = userSummary.contradictions.map((item) =>
      AnalysisAccordionItem.from(item),
    );
    dto.accuracy = userSummary.accuracy;
    dto.accuracyDescription =
      '선택한 답변들이 가장 가까운 철학자와 얼마나 일관되게 맞물리는지에 대한 신뢰도입니다.';
    return dto;
  }
}
