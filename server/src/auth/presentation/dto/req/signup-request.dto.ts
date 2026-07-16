import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

export class SignupRequest {
  @IsString({ message: '이름은 문자이어야 합니다.' })
  @IsNotEmpty({ message: '이름은 필수입니다.' })
  @MinLength(2, { message: '이름은 최소 2글자입니다.' })
  @MaxLength(10, { message: '이름은 최대 10글자입니다.' })
  @ApiProperty({ example: '유저', description: '유저 이름' })
  name!: string;

  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일은 필수입니다.' })
  @MaxLength(255, { message: '이메일은 최대 255글자입니다.' })
  @ApiProperty({ example: 'user@example.com', description: '이메일' })
  email!: string;

  @IsString({ message: '비밀번호는 문자이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호는 필수입니다.' })
  @MinLength(8, { message: '비밀번호는 최소 8글자입니다.' })
  @MaxLength(64, { message: '비밀번호는 최대 64글자입니다.' })
  @ApiProperty({ example: 'password123!', description: '비밀번호' })
  password!: string;

  @IsString({ message: '비밀번호 확인은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호 확인은 필수입니다.' })
  @MinLength(8, { message: '비밀번호 확인은 최소 8글자입니다.' })
  @MaxLength(64, { message: '비밀번호 확인은 최대 64글자입니다.' })
  @ApiProperty({ example: 'password123!', description: '비밀번호 확인' })
  passwordConfirm!: string;
}
