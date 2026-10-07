import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class InquiryInput {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(10000) content!: string;
}
export class NoticeInput extends InquiryInput {
  @ApiProperty() @IsBoolean() isPublished!: boolean;
}
export class TermInput extends InquiryInput {
  @ApiProperty({ enum: ['service', 'privacy'] })
  @IsIn(['service', 'privacy'])
  type!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(50) version!: string;
}
export class InquiryAnswerInput {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  answerContent!: string;
}
