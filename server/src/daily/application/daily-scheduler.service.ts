import { Inject, Injectable } from "@nestjs/common";
import { USER_REPOSITORY } from "src/user/domain/repository/user.repository";
import type { UserRepository } from "src/user/domain/repository/user.repository";
import { DailyService } from "./daily.service";
import { NotificationService } from "./notification.service";
import type { UserDailyQuestionRepository } from "../domain/repository/user-daily-question.repository";
import { USER_DAILY_QUESTION_REPOSITORY } from "../domain/repository/user-daily-question.repository";
import { Cron } from "@nestjs/schedule";
import { User } from "src/user/domain/model/user.entity";

@Injectable()
export class DailySchedulerService {
    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository:UserRepository,
        @Inject(USER_DAILY_QUESTION_REPOSITORY)
        private readonly userDailyQuestionRepository:UserDailyQuestionRepository,
        private readonly dailyService:DailyService,
        private readonly notificationService:NotificationService,
        
    ){}

    // 매일 자정(KST) 오늘의 질문 배정
    @Cron('0 0 * * *', { timeZone : 'Asia/Seoul'})
    async assignDailyQuestions(){
        const users = await this.userRepository.findAllActive();
        for(const user of users){
            await this.dailyService.assignForToday(user.userId);
        }
    }

    @Cron('* * * * *')
    async sendDailyAlerts(){
        const users = await this.userRepository.findAllActive();
        for(const user of users){
            if(!this.isNotifyTime(user)) continue;
            await this.notificationService.sendDailyQuestionAlert(user);
    }

}

private isNotifyTime(user: User): boolean{
    const nowHm = new Date().toLocaleTimeString('en-GB', {
        timeZone: user.timezone,
        hour: '2-digit',
        minute: '2-digit',
    });
    const targetHm = user.dailyQuestionTime.slice(0, 5);
    return nowHm === targetHm;
}

}