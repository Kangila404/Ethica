import { ApiProperty } from '@nestjs/swagger';

export class SubmitStageTwoRequest {
  @ApiProperty({ example: 201 })
  questionId!: string;

  @ApiProperty({ example: 2001 })
  followupAnswerId!: string;
}
