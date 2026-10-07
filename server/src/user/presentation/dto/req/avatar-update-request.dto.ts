import { ApiProperty } from '@nestjs/swagger';
import { IsIn, ValidateIf } from 'class-validator';

export const AVATAR_IDS = [
  'sprout',
  'book',
  'sun',
  'moon',
  'bird',
  'mountain',
] as const;

export class AvatarUpdateRequest {
  @ApiProperty({ enum: AVATAR_IDS, nullable: true })
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsIn(AVATAR_IDS)
  avatarId!: string | null;
}
