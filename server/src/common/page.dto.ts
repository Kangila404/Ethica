import { IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class PageQuery {
  @ApiPropertyOptional({
    description: '이전 페이지 마지막 ID. 최대 50개씩 조회',
  })
  @IsOptional()
  @Matches(/^[1-9]\d{0,18}$/)
  after?: string;
}
