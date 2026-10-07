import { ContentStatus } from 'src/common/content-status';
import { PageQuery } from 'src/common/page.dto';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from 'src/question/domain/enum/question-type.enum';
import { QuestionUsage } from 'src/question/domain/enum/question-usage.enum';
import { PostSegmentType } from 'src/philosopher/domain/model/post-segment.entity';
import { LearningCategory } from 'src/philosopher/domain/model/learning-profile-category.entity';
export class CategoryInput {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(50) name!: string;
  @ApiProperty() @IsInt() @Min(0) sortOrder!: number;
}
export class PhilosopherInput {
  @ApiPropertyOptional({ enum: LearningCategory, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsEnum(LearningCategory, { each: true })
  categories?: LearningCategory[];

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(50) name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(50) era!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(50) school!: string;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  coreThought!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(10000) lifeRoots!: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageKey?: string | null;
}
export class PostCardInput {
  @ApiPropertyOptional() @IsOptional() @Matches(/^[1-9]\d*$/) id?: string;
  @ApiProperty({ enum: PostSegmentType })
  @IsEnum(PostSegmentType)
  segmentType!: PostSegmentType;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  body?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageKey?: string | null;
}
export class ContentPageQuery extends PageQuery {
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(QuestionUsage) usage?: QuestionUsage;
  @IsOptional() @Matches(/^[1-9]\d*$/) categoryId?: string;
}
export class PostInput {
  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
  @ApiPropertyOptional({ type: [PostCardInput] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => PostCardInput)
  segments?: PostCardInput[];
  @ApiProperty() @Matches(/^[1-9]\d*$/) philosopherId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) title!: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageKey?: string | null;
}
export class SegmentInput {
  @ApiProperty() @Matches(/^[1-9]\d*$/) postId!: string;
  @ApiProperty({ enum: PostSegmentType })
  @IsEnum(PostSegmentType)
  segmentType!: PostSegmentType;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  body?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageKey?: string | null;
  @ApiProperty() @IsInt() @Min(0) sortOrder!: number;
}
export class ChoiceInput {
  @ApiPropertyOptional() @IsOptional() @Matches(/^[1-9]\d*$/) id?: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) body!: string;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  explanation!: string;
}
export class AnswerInput extends ChoiceInput {
  @ApiProperty() @Matches(/^[1-9]\d*$/) philosopherId!: string;
}
export class QuestionInput {
  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
  @ApiProperty({ enum: QuestionUsage })
  @IsEnum(QuestionUsage)
  usage!: QuestionUsage;
  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type!: QuestionType;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) title!: string;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  stage1Body!: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  followupBody?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageKey?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @Matches(/^[1-9]\d*$/, { each: true })
  categoryIds!: string[];
  @ApiProperty({ type: [AnswerInput] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => AnswerInput)
  answers!: AnswerInput[];
  @ApiProperty({ type: [ChoiceInput] })
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => ChoiceInput)
  followupAnswers!: ChoiceInput[];
}
