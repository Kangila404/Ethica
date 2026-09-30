import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { UserAnswer } from 'src/user-answer/domain/model/user-answer.entity';
import { UserFollowupAnswer } from 'src/user-answer/domain/model/user-followup-answer.entity';
import { Answer } from 'src/question/domain/model/answer.entity';
import { FollowupAnswer } from 'src/question/domain/model/followup-answer.entity';
import { Question } from 'src/question/domain/model/question.entity';
import {
  AnalysisSourceRepository,
  AnswerContext,
} from '../domain/repository/analysis-source.repository';
@Injectable()
export class AnalysisSourceRepositoryImpl implements AnalysisSourceRepository {
  constructor(@InjectDataSource() private readonly db: DataSource) {}
  async findContexts(userId: string): Promise<AnswerContext[]> {
    const records = await this.db
      .getRepository(UserAnswer)
      .find({ where: { userId }, order: { id: 'ASC' } });
    if (!records.length) return [];
    const answers = await this.db
      .getRepository(Answer)
      .findBy({ id: In(records.map((a) => a.answerId)) });
    const questions = await this.db
      .getRepository(Question)
      .findBy({ id: In(answers.map((a) => a.questionId)) });
    const followupRecords = await this.db
      .getRepository(UserFollowupAnswer)
      .find({ where: { userId }, order: { id: 'ASC' } });
    const followups = followupRecords.length
      ? await this.db
          .getRepository(FollowupAnswer)
          .findBy({ id: In(followupRecords.map((a) => a.followupAnswerId)) })
      : [];
    const followupByQuestion = new Map<string, string>();
    for (const record of followupRecords) {
      const f = followups.find((a) => a.id === record.followupAnswerId);
      if (f) followupByQuestion.set(f.questionId, f.body);
    }
    return records.flatMap((record) => {
      const answer = answers.find((a) => a.id === record.answerId);
      const q = questions.find((q) => q.id === answer?.questionId);
      if (!answer || !q) return [];
      return [
        {
          userAnswerId: record.id,
          questionId: q.id,
          question: q.stage1Body,
          answer: answer.body,
          followupQuestion: q.followupBody,
          followupAnswer: followupByQuestion.get(q.id) ?? null,
        },
      ];
    });
  }
}
