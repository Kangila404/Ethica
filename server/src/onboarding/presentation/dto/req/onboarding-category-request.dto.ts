import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class OnboardingCategoryRequest {
  @ApiProperty({ example: '1', description: '관심 카테고리' })
  @Matches(/^[1-9]\d*$/)
  categoryId!: string;
}
