import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateFcmTokenRequest {
  @MaxLength(255)
  @IsString()
  @IsNotEmpty()
  fcmToken!: string;
}
