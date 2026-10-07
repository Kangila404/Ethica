import { ApiProperty } from '@nestjs/swagger';
export class ComposedPhilosopher {
  @ApiProperty() philosopherId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() percent!: number;
}
export default class AnalysisResponse {
  @ApiProperty({ nullable: true, type: String }) nearestPhilosopher!:
    | string
    | null;
  @ApiProperty({ nullable: true, type: String }) nearestPhilosopherId!:
    | string
    | null;
  @ApiProperty({ type: [ComposedPhilosopher] })
  composition!: ComposedPhilosopher[];
  @ApiProperty({
    description: '답변 수 기반 참고도. 30문제에서 100; 통계적 정확도 아님',
  })
  accuracy!: number;
  @ApiProperty() accuracyDescription!: string;
  @ApiProperty() answeredCount!: number;
}
