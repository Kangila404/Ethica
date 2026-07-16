import { ApiProperty } from '@nestjs/swagger';
import { Question } from 'src/question/domain/model/question.entity';
import { QuestionType } from 'src/question/domain/enum/question-type.enum';

class AnswerItem {
  @ApiProperty({ example: '1001' })
  answerId!: string;

  @ApiProperty()
  body!: string;
}

class FollowupAnswerItem {
  @ApiProperty({ example: '2031' })
  followupAnswerId!: string;

  @ApiProperty()
  body!: string;
}

class FollowupItem {
  @ApiProperty()
  followupBody!: string;

  @ApiProperty({ type: [FollowupAnswerItem] })
  answers!: FollowupAnswerItem[];
}

class QuestionItem {
  @ApiProperty({ example: '101' })
  questionId!: string;

  @ApiProperty({ enum: QuestionType })
  type!: QuestionType;

  @ApiProperty()
  stage1Body!: string;

  @ApiProperty({ type: [AnswerItem] })
  answers!: AnswerItem[];

  @ApiProperty({ type: FollowupItem, nullable: true })
  followup!: FollowupItem | null;
}

export class OnboardingQuestionsResponse {
  @ApiProperty({ type: [QuestionItem] })
  items!: QuestionItem[];

  static of(questions: Question[]): OnboardingQuestionsResponse {
    const dto = new OnboardingQuestionsResponse();
    dto.items = questions.map((q) => ({
      questionId: q.id,
      type: q.type,
      stage1Body: q.stage1Body,
      answers: q.answers.map((a) => ({ answerId: a.id, body: a.body })),
      followup:
        q.type === QuestionType.TWO_STAGE
          ? {
              followupBody: q.followupBody!, // 2단이면 반드시 존재
              answers: q.followupAnswers.map((f) => ({
                followupAnswerId: f.id,
                body: f.body,
              })),
            }
          : null,
    }));
    return dto;
  }
}
