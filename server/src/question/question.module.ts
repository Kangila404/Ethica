import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './domain/model/question.entity';
import { Answer } from './domain/model/answer.entity';
import { FollowupAnswer } from './domain/model/followup-answer.entity';
import { QuestionCategory } from './domain/model/question-category.entity';
import { QUESTION_REPOSITORY } from './domain/repository/question.repository';
import { QuestionRepositoryImpl } from './infrastructure/persistence/repository/question.repository.impl';

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
  ],
  exports: [QUESTION_REPOSITORY],
})
export class QuestionModule {}
