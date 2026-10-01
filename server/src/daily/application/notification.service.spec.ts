jest.mock('firebase-admin', () => ({
  getApps: jest.fn(() => [{}]),
  cert: jest.fn(),
  initializeApp: jest.fn(),
}));
jest.mock('firebase-admin/messaging', () => ({ getMessaging: jest.fn() }));
import { getMessaging } from 'firebase-admin/messaging';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { User } from 'src/user/domain/model/user.entity';

describe('Daily question notification', () => {
  const send = jest.fn();
  const service = new NotificationService({} as ConfigService);
  beforeEach(() => {
    jest.clearAllMocks();
    (getMessaging as jest.Mock).mockReturnValue({ send });
    send.mockResolvedValue('message');
  });
  it('does not send when the user blocks app notifications', async () => {
    const user = { fcmToken: 'test-token', notificationEnabled: false } as User;
    expect(await service.sendDailyQuestionAlert(user, '10', '질문')).toBe(
      false,
    );
    expect(send).not.toHaveBeenCalled();
  });
  it('sends actual question text and the iOS foreground action category', async () => {
    const user = { fcmToken: 'test-token', notificationEnabled: true } as User;
    expect(
      await service.sendDailyQuestionAlert(
        user,
        '10',
        '친구를 위한\n거짓말은?',
      ),
    ).toBe(true);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: { title: '오늘의 질문', body: '친구를 위한 거짓말은?' },
        data: {
          type: 'daily_question',
          cycleId: '10',
          deepLink: 'ethica://daily',
        },
        apns: expect.objectContaining({
          payload: {
            aps: {
              category: 'DAILY_QUESTION',
              sound: 'default',
              threadId: 'ethica-daily',
            },
          },
        }) as unknown,
      }),
    );
  });
  it('bounds long notification bodies without splitting unicode characters', async () => {
    await service.sendDailyQuestionAlert(
      { fcmToken: 'test-token', notificationEnabled: true } as User,
      '10',
      '😀'.repeat(400),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: { title: '오늘의 질문', body: '😀'.repeat(300) },
      }),
    );
  });
});
