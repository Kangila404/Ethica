import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { User } from "src/user/domain/model/user.entity";
import { USER_REPOSITORY } from "src/user/domain/repository/user.repository";
import type {UserRepository } from "src/user/domain/repository/user.repository";
import { DailyTimeRequest } from "src/user/presentation/dto/req/dailyTime-request.dto";
import { DailyTimeResponse } from "../presentation/dto/res/dailyTime-response.dto";

@Injectable()
export class OnboardingService {
    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: UserRepository,
    ){}


    async registerDailyTime(userId:string, request:DailyTimeRequest): Promise<DailyTimeResponse>{
        const user = await this.getUserOrThrow(userId);
        user.changeDailyTime(request.dailyQuestionTime, request.timezone);
        await this.userRepository.save(user);
        return DailyTimeResponse.from(user);
    }






    // 메서드
    private async getUserOrThrow(userId:string): Promise<User> {
        const user = await this.userRepository.findByUserId(userId);
        if(!user) {
            throw new NotFoundException('유저를 찾을 수 없습니다.');
        }
        return user;
    }


}