import { ApiProperty } from '@nestjs/swagger';

export class SubmitStageOneResponse {
  @ApiProperty({ example: true })
  aggregated!: boolean;

  @ApiProperty({ example: false })
  requiresApp!: boolean;

  explanation!: string;
  philosopherId!: string;

  static from(
    requiresApp = false,
    explanation = '',
    philosopherId = '',
    aggregated = true,
  ): SubmitStageOneResponse {
    const res = new SubmitStageOneResponse();
    res.aggregated = aggregated;
    res.requiresApp = requiresApp;
    res.explanation = explanation;
    res.philosopherId = philosopherId;
    return res;
  }
}
