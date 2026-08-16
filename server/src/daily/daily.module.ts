import { Module } from "@nestjs/common";
import { QuestionModule } from "src/question/question.module";
import { DailyController } from "./presentation/controller/daily.controller";
import { DailyService } from "./application/daily.service";
import { UserModule } from "src/user/user.module";
import { NotificationService } from "./application/notification.service";
import { DailySchedulerService } from "./application/daily-scheduler.service";
import { USER_DAILY_QUESTION_REPOSITORY } from "./domain/repository/user-daily-question.repository";
import { UserDailyQuestionRepositoryImpl } from "./infrastructure/persistence/repository/user-daily-question.repository.impl";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserDailyQuestion } from "./domain/model/user_daily_question.entity";
import { UserAnswerModule } from "src/user-answer/user-answer.module";
@Module({
    imports: [
        QuestionModule,
        UserModule,
        UserAnswerModule,
        TypeOrmModule.forFeature([UserDailyQuestion]),
    ],
    controllers: [DailyController],
    providers: [
        DailyService, 
        NotificationService, 
        DailySchedulerService,
        {
            provide: USER_DAILY_QUESTION_REPOSITORY, 
            useClass: UserDailyQuestionRepositoryImpl,
        }
    ]
})

export class DailyModule {}
