import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsTimeZone, Matches } from 'class-validator';
export class OnboardingTimeRequest {
  @ApiPropertyOptional({ default: '08:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  dailyQuestionTime?: string;
  @ApiProperty({ example: 'Asia/Seoul', description: '기기 IANA 타임존' })
  @IsTimeZone()
  timezone!: string;
}
