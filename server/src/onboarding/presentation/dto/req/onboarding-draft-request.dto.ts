import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
export class OnboardingDraftRequest {
  @ApiProperty() @Matches(/^[1-9]\d*$/) questionId!: string;
  @ApiProperty() @Matches(/^[1-9]\d*$/) answerId!: string;
}
