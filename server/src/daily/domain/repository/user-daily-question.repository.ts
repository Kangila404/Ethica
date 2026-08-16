import { UserDailyQuestion } from "../model/user_daily_question.entity";

export const USER_DAILY_QUESTION_REPOSITORY = Symbol('USER_DAILY_QUESTION_REPOSITORY');

export interface UserDailyQuestionRepository {
    
    findByUserIdAndServiceDate(
        userId:string,
        serviceDate:string
    ):Promise<UserDailyQuestion | null>;

    // (중복 방지) 유저가 출제 받은 questionId
    findServicedQuestionIds(userId: string): Promise<string[]>;

    save(userDailyQuestion:UserDailyQuestion): Promise<UserDailyQuestion>;

}