import { TodayAnalysisService } from '../../application/today-analysis.service';
import { TodayAnalysisResponse } from '../dto/res/today-analysis-response.dto';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AnalysisService } from 'src/analysis/application/analysis.service';
import { CurrentUserId } from 'src/auth/infrastructure/security/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/infrastructure/security/jwt-auth.guard';
import AnaisysResponse from '../dto/res/analysis-response.dto';
import { ContradictionResponse } from '../dto/res/contradiction-response.dto';

@ApiTags('분석 API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('/api/analysis')
export class AnalisysController {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly todayAnalysis: TodayAnalysisService,
  ) {}

  @Get('/today')
  @ApiOperation({ summary: '오늘 선택에 따른 누적 성향 변화' })
  @ApiOkResponse({ type: TodayAnalysisResponse })
  getToday(@CurrentUserId() userId: string): Promise<TodayAnalysisResponse> {
    return this.todayAnalysis.getToday(userId);
  }

  @ApiOperation({ summary: '분석 결과 조회' })
  @Get('/summary')
  @ApiOkResponse({ type: AnaisysResponse })
  getAnalysis(@CurrentUserId() userId: string): Promise<AnaisysResponse> {
    return this.analysisService.getAnalysis(userId);
  }

  @ApiOperation({ summary: '모순점 결과 조회' })
  @Get('/contradictions')
  @ApiOkResponse({ type: ContradictionResponse })
  getContradiction(
    @CurrentUserId() userId: string,
  ): Promise<ContradictionResponse> {
    return this.analysisService.getContradiction(userId);
  }

  @ApiOperation({ summary: '모순점 분석 요청' })
  @Post('/contradictions')
  @ApiOkResponse({ type: ContradictionResponse })
  @HttpCode(HttpStatus.OK)
  analyzeContradiction(
    @CurrentUserId() userId: string,
  ): Promise<ContradictionResponse> {
    return this.analysisService.analyzeContradiction(userId);
  }
}
