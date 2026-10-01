import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UserService } from '../../application/user.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserResponse } from '../dto/res/user-response.dto';
import { NicknameUpdateRequest } from '../dto/req/nicknameUpdate-request.dto';
import { MessageResponse } from 'src/common/dto/res/message-response.dto';
import { DailyTimeRequest } from '../dto/req/dailyTime-request.dto';
import { NotificationRequest } from '../dto/req/notification-request.dto';
import { NotificationResponse } from '../dto/res/notification-response.dto';
import { CurrentUserId } from 'src/auth/infrastructure/security/current-user.decorator';
import { UpdateFcmTokenRequest } from '../dto/req/update-fcm-token-request.dto';
import { JwtAuthGuard } from 'src/auth/infrastructure/security/jwt-auth.guard';
import { AvatarUpdateRequest } from '../dto/req/avatar-update-request.dto';

@ApiTags('USER API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('/api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  @ApiOperation({ summary: '내 정보 조회' })
  getMe(@CurrentUserId() userId: string): Promise<UserResponse> {
    return this.userService.getMe(userId);
  }

  @Patch('/me')
  @ApiOperation({ summary: '닉네임 수정' })
  updateNickname(
    @CurrentUserId() userId: string,
    @Body() request: NicknameUpdateRequest,
  ): Promise<MessageResponse> {
    return this.userService.updateNickname(userId, request);
  }

  @Patch('/me/avatar')
  @ApiOperation({ summary: '내장 프로필 이미지 변경 (null은 기본 이미지)' })
  updateAvatar(
    @CurrentUserId() userId: string,
    @Body() request: AvatarUpdateRequest,
  ): Promise<UserResponse> {
    return this.userService.updateAvatar(userId, request);
  }

  @Patch('/me/daily-time')
  @ApiOperation({ summary: '위젯 시간 변경' })
  updateDailyTime(
    @CurrentUserId() userId: string,
    @Body() request: DailyTimeRequest,
  ): Promise<MessageResponse> {
    return this.userService.updateDailyTime(userId, request);
  }

  @Patch('/me/notification')
  @ApiOperation({ summary: '위젯 보내기 변경' })
  updateNotification(
    @CurrentUserId() userId: string,
    @Body() request: NotificationRequest,
  ): Promise<NotificationResponse> {
    return this.userService.updateNotification(userId, request);
  }

  @Patch('/me/fcm-token')
  @ApiOperation({ summary: 'FCM 토큰 등록' })
  updateFcmToken(
    @CurrentUserId() userId: string,
    @Body() request: UpdateFcmTokenRequest,
  ): Promise<void> {
    return this.userService.updateFcmToken(userId, request.fcmToken);
  }
}
