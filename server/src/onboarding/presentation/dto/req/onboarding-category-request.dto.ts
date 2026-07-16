import { ApiProperty } from '@nestjs/swagger';

export class OnboardingCategoryRequest {
  @ApiProperty({ example: '1', description: '관심 카테고리' })
  categoryId!: string;
}
