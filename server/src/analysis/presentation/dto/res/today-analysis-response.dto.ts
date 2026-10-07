import { ApiProperty } from '@nestjs/swagger';
import { ComposedPhilosopher } from './analysis-response.dto';

export class AnalysisPhilosopher {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() school!: string;
  @ApiProperty({ type: String, nullable: true }) imageKey!: string | null;
}
export class CompositionState {
  @ApiProperty() answerCount!: number;
  @ApiProperty({ type: AnalysisPhilosopher, nullable: true })
  nearestPhilosopher!: AnalysisPhilosopher | null;
  @ApiProperty({ type: [ComposedPhilosopher] })
  composition!: ComposedPhilosopher[];
}
export class CompositionChange {
  @ApiProperty() philosopherId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() beforePercent!: number;
  @ApiProperty() afterPercent!: number;
  @ApiProperty({ description: '표시 비율의 차이, 퍼센트포인트(%p)' })
  deltaPercentagePoints!: number;
}
export class TodayAnalysisResponse {
  @ApiProperty({ enum: ['waiting', 'preparing', 'pending', 'completed'] })
  status!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: '현재 일일 출제 사이클의 현지 날짜',
  })
  serviceDate!: string | null;
  @ApiProperty({ type: Date, nullable: true }) nextDailyAt!: Date | null;
  @ApiProperty({ type: AnalysisPhilosopher, nullable: true })
  selectedPhilosopher!: AnalysisPhilosopher | null;
  @ApiProperty({ type: CompositionState, nullable: true })
  before!: CompositionState | null;
  @ApiProperty({ type: CompositionState, nullable: true })
  after!: CompositionState | null;
  @ApiProperty({ type: [CompositionChange] }) changes!: CompositionChange[];
  @ApiProperty() nearestChanged!: boolean;
}
