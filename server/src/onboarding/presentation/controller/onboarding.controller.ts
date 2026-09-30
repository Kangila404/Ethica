import { OnboardingDraftRequest } from '../dto/req/onboarding-draft-request.dto';
import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { OnboardingTimeRequest } from '../dto/req/onboarding-time-request.dto';
import { OnboardingResultResponse } from '../dto/res/onboarding-result-response.dto';
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
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
@Controller('/api/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('/daily-time')
  @ApiCreatedResponse({ type: DailyTimeResponse })
  @ApiOperation({ summary: '위젯 호출 시간 등록' })
  registerDailyTime(
    @CurrentUserId() userId: string,
    @Body() request: OnboardingTimeRequest,
  ): Promise<DailyTimeResponse> {
    return this.onboardingService.registerDailyTime(userId, request);
  }

  @Get('/status')
  @ApiOkResponse({ type: OnboardingStatusResponse })
  @ApiOperation({ summary: '온보딩 상태 조회(온보딩 중도 이탈 재개용)' })
  getOnboardingStatus(
    @CurrentUserId() userId: string,
  ): Promise<OnboardingStatusResponse> {
    return this.onboardingService.getOnboardingStatus(userId);
  }

  @Post('/question')
  @ApiCreatedResponse({ type: OnboardingCategoryResponse })
  @ApiOperation({ summary: '관심 카테고리 선택' })
  selectCategory(
    @CurrentUserId() userId: string,
    @Body() request: OnboardingCategoryRequest,
  ): Promise<OnboardingCategoryResponse> {
    return this.onboardingService.selectCategory(userId, request);
  }

  @Get('/questions')
  @ApiOkResponse({ type: OnboardingQuestionsResponse })
  @ApiOperation({ summary: '온보딩 문제 호출' })
  getOnboardingQuestions(
    @CurrentUserId() userId: string,
  ): Promise<OnboardingQuestionsResponse> {
    return this.onboardingService.getOnboardingQuestions(userId);
  }
  @Post('/answers')
  @ApiCreatedResponse({ type: OnboardingAnswerResponse })
  @ApiOperation({ summary: '온보딩 답 제출' })
  submitAnswer(
    @CurrentUserId() userId: string,
    @Body() request: OnboardingAnswerRequest,
  ): Promise<OnboardingAnswerResponse> {
    return this.onboardingService.submitAnswer(userId, request);
  }

  @Post('answers/draft')
  @ApiCreatedResponse({ type: OnboardingStatusResponse })
  @ApiOperation({
    summary: '온보딩 2단 문제의 1단 선택 임시 저장: 집계하지 않음',
  })
  saveDraft(
    @CurrentUserId() userId: string,
    @Body() request: OnboardingDraftRequest,
  ): Promise<OnboardingStatusResponse> {
    return this.onboardingService.saveDraft(userId, request);
  }

  @Post('result')
  @ApiCreatedResponse({ type: OnboardingResultResponse })
  @ApiOperation({
    summary:
      '온보딩 결과 확인: 비율과 요약 상태 반환. AI 생성은 POST /api/analysis/contradictions',
  })
  getResult(
    @CurrentUserId() userId: string,
  ): Promise<OnboardingResultResponse> {
    return this.onboardingService.getResult(userId);
  }
}
