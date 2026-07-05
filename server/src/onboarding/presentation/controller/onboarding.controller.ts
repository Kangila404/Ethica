import { Body, Controller, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DailyTimeRequest } from "../../../user/presentation/dto/req/dailyTime-request.dto";
import { DailyTimeResponse } from "../dto/res/dailyTime-response.dto";
import { OnboardingService } from '../../application/onboarding.service'

@ApiTags('Onboarding API')
@Controller('/api/onboarding')
export class OnboardingController {
    constructor(private readonly onboardingService:OnboardingService){}


    @Post('/daily-time')
    @ApiOperation({ summary : '위젯 호출 시간 등록' })
    registerDailyTime(
        @Query('userId') userId: string,
        @Body() request: DailyTimeRequest): Promise<DailyTimeResponse>{
            return this.onboardingService.registerDailyTime(userId, request);
    }
}