import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator'

export class DailyTimeRequest {

    @ApiProperty({ example: '08:00', description: '일일 문제 시각 (HH:mm)' })
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'HH:mm 형식이어야 합니다.' })
    dailyQuestionTime!: string;

    @ApiProperty({ example: 'Asia/Seoul', description: '타임존 (IANA)' })
    @IsString()
    timezone!: string;
}