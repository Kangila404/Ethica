import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './domain/model/question.entity';
import { Answer } from './domain/model/answer.entity';
import { FollowupAnswer } from './domain/model/followup-answer.entity';
import { QuestionCategory } from './domain/model/question-category.entity';
import { QUESTION_REPOSITORY } from './domain/repository/question.repository';
import { QuestionRepositoryImpl } from './infrastructure/persistence/repository/question.repository.impl';
import { ANSWER_REPOSITORY } from './domain/repository/answer.repository';
import { AnswerRepositoryImpl } from './infrastructure/persistence/answer.repository.impl';
import { FOLLOWUP_ANSWER_REPOSITORY } from './domain/repository/followup-answer.repository';
import { FollowupAnswerRepositoryImpl } from './infrastructure/persistence/followup-answer.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Question,
      Answer,
      FollowupAnswer,
      QuestionCategory,
    ]),
  ],
  controllers: [],
  providers: [
    { provide: QUESTION_REPOSITORY, useClass: QuestionRepositoryImpl },
    { provide: ANSWER_REPOSITORY, useClass: AnswerRepositoryImpl },
    {
      provide: FOLLOWUP_ANSWER_REPOSITORY,
      useClass: FollowupAnswerRepositoryImpl,
    },
  ],
  exports: [QUESTION_REPOSITORY, ANSWER_REPOSITORY, FOLLOWUP_ANSWER_REPOSITORY],
})
export class QuestionModule {}
