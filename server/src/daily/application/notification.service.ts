import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { User } from 'src/user/domain/model/user.entity';
import { getMessaging } from 'firebase-admin/messaging';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');

    if (!projectId) {
      this.logger.warn('Firebase 환경변수 미설정 — 푸시 비활성화 상태로 부팅');
      return;
    }

    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail: this.config.get<string>('FIREBASE_CLIENT_EMAIL'),
          privateKey: this.config
            .get<string>('FIREBASE_PRIVATE_KEY')
            ?.replace(/\\n/g, '\n'), // .env의 \n → 실제 줄바꿈
        }),
      });
      this.logger.log('Firebase 초기화 완료');
    }
  }

  async sendDailyQuestionAlert(
    user: User,
    cycleId: string,
    questionBody: string,
  ): Promise<boolean> {
    if (!user.fcmToken || !user.notificationEnabled) return false;
    if (getApps().length === 0) return false;

    await getMessaging().send({
      token: user.fcmToken,
      data: { type: 'daily_question', cycleId, deepLink: 'ethica://daily' },
      apns: {
        headers: { 'apns-collapse-id': `daily-${cycleId}` },
        payload: {
          aps: {
            category: 'DAILY_QUESTION',
            sound: 'default',
            threadId: 'ethica-daily',
          },
        },
      },
      notification: {
        title: '오늘의 질문',
        body: Array.from(questionBody.replace(/\s+/g, ' ').trim())
          .slice(0, 300)
          .join(''),
      },
    });
    return true;
  }
}
