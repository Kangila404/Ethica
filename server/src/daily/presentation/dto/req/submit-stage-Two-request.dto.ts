import { Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitStageTwoRequest {
  @Matches(/^[1-9]\d*$/)
  @ApiProperty({ example: 201 })
  questionId!: string;

  @Matches(/^[1-9]\d*$/)
  @ApiProperty({ example: 2001 })
  followupAnswerId!: string;
}
