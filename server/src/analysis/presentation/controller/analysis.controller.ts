import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  constructor(private readonly analysisService: AnalysisService) {}

  @ApiOperation({ summary: '분석 결과 조회' })
  @Get('/summary')
  getAnalysis(@CurrentUserId() userId: string): Promise<AnaisysResponse> {
    return this.analysisService.getAnalysis(userId);
  }

  @ApiOperation({ summary: '모순점 결과 조회' })
  @Get('/contradictions')
  getContradiction(
    @CurrentUserId() userId: string,
  ): Promise<ContradictionResponse> {
    return this.analysisService.getContradiction(userId);
  }

  @ApiOperation({ summary: '모순점 분석 요청' })
  @Post('/contradictions')
  analyzeContradiction(
    @CurrentUserId() userId: string,
  ): Promise<ContradictionResponse> {
    return this.analysisService.analyzeContradiction(userId);
  }
}
