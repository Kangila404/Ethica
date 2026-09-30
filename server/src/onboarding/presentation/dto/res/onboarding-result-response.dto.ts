import { ApiProperty } from '@nestjs/swagger';
import AnalysisResponse from 'src/analysis/presentation/dto/res/analysis-response.dto';
import { ContradictionResponse } from 'src/analysis/presentation/dto/res/contradiction-response.dto';
export class OnboardingResultResponse {
  @ApiProperty({ type: AnalysisResponse }) analysis!: AnalysisResponse;
  @ApiProperty({ type: ContradictionResponse }) summary!: ContradictionResponse;
}
