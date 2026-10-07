import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import type { PushPlatform } from '../../../domain/model/push-device.entity';

export class RegisterPushDeviceRequest {
  @ApiProperty({ enum: ['ios', 'android'] })
  @IsIn(['ios', 'android'])
  platform!: PushPlatform;

  @ApiProperty({
    description:
      '이 설치의 FCM 등록 토큰. 회전 시 같은 installationId로 다시 등록합니다.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  fcmToken!: string;

  @ApiProperty({
    description: '현재 기기에서 알림 수신 동의 및 OS 권한을 모두 확인한 상태',
  })
  @IsBoolean()
  enabled!: boolean;
}
