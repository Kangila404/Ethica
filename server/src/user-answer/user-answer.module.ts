import { Module } from '@nestjs/common';
import { USER_ANSWER_REPOSITORY } from './domain/repository/user-answer.repository';
import { USER_FOLLOWUP_ANSWER_REPOSITORY } from './domain/repository/user-followup-answer.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAnswer } from './domain/model/user-answer.entity';
import { UserFollowupAnswer } from './domain/model/user-followup-answer.entity';
import { UserAnswerRepositoryImpl } from './infrastructure/persistence/repository/user-answer.repository.impl';
import { UserFollowupAnswerRepositoryImpl } from './infrastructure/persistence/repository/user-followup-answer.repository.impl';
import { UserModule } from 'src/user/user.module';
import { QuestionModule } from 'src/question/question.module';
import { ArchiveController } from './presentation/controller/archive.controller';
import { ArchiveService } from './application/archive.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAnswer, UserFollowupAnswer]),
    UserModule,
    QuestionModule
  ],
  controllers: [ArchiveController],
  providers: [
    ArchiveService,
    {
      provide: USER_ANSWER_REPOSITORY,
      useClass: UserAnswerRepositoryImpl,
    },
    {
      provide: USER_FOLLOWUP_ANSWER_REPOSITORY,
      useClass: UserFollowupAnswerRepositoryImpl,
    },
  ],
  exports: [USER_ANSWER_REPOSITORY, USER_FOLLOWUP_ANSWER_REPOSITORY],
})
export class UserAnswerModule {}
