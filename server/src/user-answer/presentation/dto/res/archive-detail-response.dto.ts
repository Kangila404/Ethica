import { Answer } from 'src/question/domain/model/answer.entity';
import { Question } from 'src/question/domain/model/question.entity';
import { UserAnswer } from 'src/user-answer/domain/model/user-answer.entity';
import { ApiProperty } from '@nestjs/swagger';

export class ArchiveFollowupResponse {
  @ApiProperty({ example: '친구가 되갚는 거짓말을 해도 보호할 건가요?' })
  questionBody!: string;

  @ApiProperty({ example: '그래도 보호한다.' })
  myAnswer!: string;

  @ApiProperty({ example: '관계에 대한 책임을 우선한 선택입니다.' })
  explanation!: string;
}

export class ArchiveDetailResponse {
  @ApiProperty({ example: '5012', description: '사용자 답변 ID' })
  userAnswerId!: string;

  @ApiProperty({ example: '2026-06-23', description: '답변한 날짜 (Asia/Seoul)' })
  serviceDate!: string;

  @ApiProperty({ example: '친구의 거짓말을 알게 되었다. 진실을 말해야 할까?' })
  questionBody!: string;

  @ApiProperty({ example: '말하지 않는 편이 친구를 보호한다고 생각한다.' })
  myAnswer!: string;

  @ApiProperty({ example: '선택의 결과보다 관계와 배려를 우선한 판단입니다.' })
  explanation!: string;

  @ApiProperty({
    type: () => ArchiveFollowupResponse,
    example: null,
    nullable: true,
    description: '2단계 답변. 아직 답하지 않은 경우 null',
  })
  followup!: ArchiveFollowupResponse | null;

  static of(
    userAnswer: UserAnswer,
    question: Question,
    answer: Answer,
  ): ArchiveDetailResponse {
    const response = new ArchiveDetailResponse();

    response.userAnswerId = userAnswer.id;
    response.serviceDate = userAnswer.answeredAt.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Seoul',
    });
    response.questionBody = question.stage1Body;
    response.myAnswer = answer.body;
    response.explanation = answer.explanation;
    response.followup = null;

    return response;
  }
}
