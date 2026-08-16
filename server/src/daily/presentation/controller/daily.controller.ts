import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from 'src/auth/infrastructure/security/current-user.decorator';
import DailyQuestionResponse from '../dto/res/daily-question-response.dto';
import { DailyService } from 'src/daily/application/daily.service';
import { SubmitStageOneRequest } from '../dto/req/submit-stage-One-request.dto';
import { SubmitStageOneResponse } from '../dto/res/submit-stage-one-response.dto';
import { SubmitStageTwoResponse } from '../dto/res/submit-stage-two-response.dto';
import { SubmitStageTwoRequest } from '../dto/req/submit-stage-Two-request.dto';
import { JwtAuthGuard } from 'src/auth/infrastructure/security/jwt-auth.guard';

@ApiTags('Daily API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('/api/daily')
export class DailyController {
  constructor(private readonly dailyService: DailyService) {}

  @ApiOperation({ summary: '금일 문제 조회' })
  @Get('/today')
  getDaily(@CurrentUserId() userId: string): Promise<DailyQuestionResponse> {
    return this.dailyService.getDaily(userId);
  }

  @ApiOperation({ summary: '1단 문제 제출' })
  @Post('/answers/stage1')
  submitStageOne(
    @CurrentUserId() userId: string,
    @Body() request: SubmitStageOneRequest,
  ): Promise<SubmitStageOneResponse> {
    return this.dailyService.submitStageOne(userId, request);
  }

  @ApiOperation({ summary: '2단 문제 제출' })
  @Post('/answers/stage2')
  submitStageTwo(
    @CurrentUserId() userId: string,
    @Body() request: SubmitStageTwoRequest,
  ): Promise<SubmitStageTwoResponse> {
    return this.dailyService.submitStageTwo(userId, request);
  }

  // DailyController에 임시 테스트용
  @Post('/assign/me') // 개발용 — 나중에 삭제
  @ApiOperation({ summary: '[DEV] 내 오늘의 질문 수동 배정' })
  assignForMe(@CurrentUserId() userId: string): Promise<void> {
    return this.dailyService.assignForToday(userId);
  }
}
