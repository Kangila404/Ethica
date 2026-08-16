import { ApiProperty } from '@nestjs/swagger';

export class SubmitStageOneResponse {
  @ApiProperty({ example: true })
  aggregated!: boolean;

  @ApiProperty({ example: false })
  requiresApp!: boolean;

  static from(): SubmitStageOneResponse {
    const res = new SubmitStageOneResponse();
    res.aggregated = true;
    res.requiresApp = false;
    return res;
  }
}
