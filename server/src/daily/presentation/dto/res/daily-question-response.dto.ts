import { DailyQuestionStatus } from 'src/daily/domain/enums/daily-question-status.enum';
import { Answer } from 'src/question/domain/model/answer.entity';
import { Question } from 'src/question/domain/model/question.entity';

export default class DailyQuestionResponse {
  stage1Body!: string;
  followupBody!: string | null;
  imageKey!: string | null;
  answers!: DailyAnswerOption[];
  userDailyQuestion!: DailyQuestionStatus;

  static of(
    question: Question,
    dailyQuestionStatus: DailyQuestionStatus,
  ): DailyQuestionResponse {
    const dto = new DailyQuestionResponse();
    dto.stage1Body = question.stage1Body;
    dto.followupBody = question.followupBody;
    dto.imageKey = question.imageKey;
    dto.answers = (question.answers ?? []).map((answer) =>
      DailyAnswerOption.from(answer),
    );
    dto.userDailyQuestion = dailyQuestionStatus;
    return dto;
  }
}

class DailyAnswerOption {
  id!: string;
  body!: string;

  static from(answer: Answer): DailyAnswerOption {
    const dto = new DailyAnswerOption();
    dto.id = answer.id;
    dto.body = answer.body;
    return dto;
  }
}
