import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OnboardingAnswerRequest {
  @ApiProperty({ example: '103' })
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @ApiProperty({ example: '1031' })
  @IsString()
  @IsNotEmpty()
  answerId!: string;

  @ApiProperty({ example: '2032', required: false })
  @IsOptional()
  @IsString()
  followupAnswerId?: string;
}
