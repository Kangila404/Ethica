import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  PUSH_DEVICE_REPOSITORY,
  type PushDeviceRepository,
} from 'src/user/domain/repository/push-device.repository';
import { User } from 'src/user/domain/model/user.entity';
import { getMessaging } from 'firebase-admin/messaging';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(PUSH_DEVICE_REPOSITORY)
    private readonly devices: PushDeviceRepository,
  ) {}

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
    if (getApps().length === 0) return false;
    const targets = new Set(
      (await this.devices.enabled(user.id)).map((device) => device.token),
    );
    // The original iOS endpoint/preference controls its legacy slot only.
    // Turning it off at iOS logout must not disable registered Android devices.
    if (user.fcmToken && user.notificationEnabled) targets.add(user.fcmToken);
    const delivered = new Set(await this.devices.delivered(cycleId));
    let sent = delivered.size > 0;
    let failed = false;
    for (const token of targets) {
      const hash = createHash('sha256').update(token).digest('hex');
      if (delivered.has(hash)) continue;
      try {
        await getMessaging().send({
          token,
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
          android: {
            collapseKey: `daily-${cycleId}`,
            notification: {
              channelId: 'daily_questions',
              tag: `daily-${cycleId}`,
            },
          },
          notification: {
            title: '오늘의 질문',
            body: Array.from(questionBody.replace(/\s+/g, ' ').trim())
              .slice(0, 300)
              .join(''),
          },
        });
        await this.devices.recordDelivery(cycleId, hash);
        sent = true;
      } catch (error: unknown) {
        const code = (error as { code?: string }).code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          await this.devices.retire(user.id, token);
        } else failed = true;
      }
    }
    // The scheduler retries only unfinished targets; successful ones are recorded.
    if (failed) throw new Error('Some notification deliveries require retry');
    return sent;
  }
}
