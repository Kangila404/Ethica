import { Transactional } from 'typeorm-transactional';
import { dailyBoundary, dailyDate } from 'src/common/daily-clock';
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from '../domain/repository/user.repository';
import type { UserRepository } from '../domain/repository/user.repository';
import { UserResponse } from '../presentation/dto/res/user-response.dto';
import { NicknameUpdateRequest } from '../presentation/dto/req/nicknameUpdate-request.dto';
import { MessageResponse } from 'src/common/dto/res/message-response.dto';
import { User } from '../domain/model/user.entity';
import { DailyTimeRequest } from '../presentation/dto/req/dailyTime-request.dto';
import { NotificationResponse } from '../presentation/dto/res/notification-response.dto';
import { NotificationRequest } from '../presentation/dto/req/notification-request.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.getUserOrThrow(userId, false);
    return UserResponse.from(user);
  }

  @Transactional()
  async updateNickname(
    userId: string,
    request: NicknameUpdateRequest,
  ): Promise<MessageResponse> {
    const user = await this.getUserOrThrow(userId);
    user.changeName(request.name);
    await this.userRepository.save(user);
    return new MessageResponse('success');
  }

  @Transactional()
  async updateDailyTime(
    userId: string,
    request: DailyTimeRequest,
  ): Promise<MessageResponse> {
    const user = await this.userRepository.findByUserId(userId, true);
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');
    const now = new Date();
    user.pendingDailyQuestionTime = request.dailyQuestionTime;
    user.pendingTimezone = request.timezone;
    user.dailyScheduleEffectiveAt = dailyBoundary(
      now,
      request.dailyQuestionTime,
      request.timezone,
      true,
    );
    if (
      user.nextDailyAt &&
      dailyDate(user.nextDailyAt, user.timezone || 'Asia/Seoul') >
        dailyDate(now, user.timezone || 'Asia/Seoul')
    ) {
      user.nextDailyAt = user.dailyScheduleEffectiveAt;
    }
    await this.userRepository.save(user);
    return new MessageResponse('success');
  }

  @Transactional()
  async deleteUser(userId: string): Promise<MessageResponse> {
    const user = await this.getUserOrThrow(userId);
    user.withdraw();
    await this.userRepository.save(user);
    await this.userRepository.softRemove(user);
    return new MessageResponse('success');
  }

  @Transactional()
  async updateNotification(
    userId: string,
    request: NotificationRequest,
  ): Promise<NotificationResponse> {
    const user = await this.getUserOrThrow(userId);
    user.updateNotification(request.notificationEnabled);
    await this.userRepository.save(user);
    return NotificationResponse.from(user);
  }

  @Transactional()
  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    const user = await this.getUserOrThrow(userId);
    user.fcmToken = fcmToken;
    await this.userRepository.save(user);
  }

  // 메서드
  private async getUserOrThrow(userId: string, lock = true): Promise<User> {
    const user = await this.userRepository.findByUserId(userId, lock);
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }
    return user;
  }
}
