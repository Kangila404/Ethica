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
    const user = await this.getUserOrThrow(userId);
    return UserResponse.from(user);
  }

  async updateNickname(
    userId: string,
    request: NicknameUpdateRequest,
  ): Promise<MessageResponse> {
    const user = await this.getUserOrThrow(userId);
    user.changeName(request.name);
    await this.userRepository.save(user);
    return new MessageResponse('success');
  }

  async updateDailyTime(
    userId: string,
    request: DailyTimeRequest,
  ): Promise<MessageResponse> {
    const user = await this.getUserOrThrow(userId);
    user.updateDailyTime(request.dailyQuestionTime, request.timezone);
    await this.userRepository.save(user);
    return new MessageResponse('success');
  }

  async deleteUser(userId: string): Promise<MessageResponse> {
    const user = await this.getUserOrThrow(userId);
    user.withdraw();
    await this.userRepository.save(user);
    await this.userRepository.softRemove(user);
    return new MessageResponse('success');
  }

  async updateNotification(
    userId: string,
    request: NotificationRequest,
  ): Promise<NotificationResponse> {
    const user = await this.getUserOrThrow(userId);
    user.updateNotification(request.notificationEnabled);
    await this.userRepository.save(user);
    return NotificationResponse.from(user);
  }

  // 메서드
  private async getUserOrThrow(userId: string): Promise<User> {
    const user = await this.userRepository.findByUserId(userId);
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }
    return user;
  }
}
