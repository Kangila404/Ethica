import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/user/domain/model/user.entity';

export class OnboardingCategoryResponse {
  @ApiProperty({ example: '1' })
  interestCategoryId!: string;

  static of(user: User): OnboardingCategoryResponse {
    const dto = new OnboardingCategoryResponse();
    dto.interestCategoryId = user.interestCategoryId!;
    return dto;
  }
}
