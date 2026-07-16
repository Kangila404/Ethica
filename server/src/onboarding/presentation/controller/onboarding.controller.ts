import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DailyTimeRequest } from '../../../user/presentation/dto/req/dailyTime-request.dto';
import { DailyTimeResponse } from '../dto/res/dailyTime-response.dto';
import { OnboardingService } from '../../application/onboarding.service';
import { JwtAuthGuard } from '../../../auth/infrastructure/security/jwt-auth.guard';
import { CurrentUserId } from '../../../auth/infrastructure/security/current-user.decorator';
import { OnboardingStatusResponse } from '../dto/res/onboarding-status-response.dto';
import { OnboardingCategoryRequest } from '../dto/req/onboarding-category-request.dto';
import { OnboardingCategoryResponse } from '../dto/res/onboarding-category-response.dto';
import { OnboardingQuestionsResponse } from '../dto/res/onboarding-question-response.dto';
import { OnboardingAnswerResponse } from '../dto/res/onboarding-answer-response.dto';
import { OnboardingAnswerRequest } from '../dto/req/onboarding-answer-request.dto';

@ApiBearerAuth()
@ApiTags('Onboarding API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('/api/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('/daily-time')
  @ApiOperation({ summary: '위젯 호출 시간 등록' })
  registerDailyTime(
    @CurrentUserId() userId: string,
    @Body() request: DailyTimeRequest,
  ): Promise<DailyTimeResponse> {
    return this.onboardingService.registerDailyTime(userId, request);
  }

  @Get('/status')
  @ApiOperation({ summary: '온보딩 상태 조회(온보딩 중도 이탈 재개용)' })
  getOnboardingStatus(
    @CurrentUserId() userId: string,
  ): Promise<OnboardingStatusResponse> {
    return this.onboardingService.getOnboardingStatus(userId);
  }

  @Post('/question')
  @ApiOperation({ summary: '관심 카테고리 선택' })
  selectCategory(
    @CurrentUserId() userId: string,
    @Body() request: OnboardingCategoryRequest,
  ): Promise<OnboardingCategoryResponse> {
    return this.onboardingService.selectCategory(userId, request);
  }

  @Get('/questions')
  @ApiOperation({ summary: '온보딩 문제 호출' })
  getOnboardingQuestions(
    @CurrentUserId() userId: string,
  ): Promise<OnboardingQuestionsResponse> {
    return this.onboardingService.getOnboardingQuestions(userId);
  }
  s;
  @Post('/answers')
  @ApiOperation({ summary: '온보딩 답 제출' })
  submitAnswer(
    @CurrentUserId() userId: string,
    @Body() request: OnboardingAnswerRequest,
  ): Promise<OnboardingAnswerResponse> {
    return this.onboardingService.submitAnswer(userId, request);
  }

  // @Post('result')
  // @ApiOperation({summary: '온보딩 결과'})
  // getResult(@CurrentUserId() userId: string):Promise<OnboardingResultResponse>{
  //   return this.onboardingService.getResult(userId);
  // }
}
