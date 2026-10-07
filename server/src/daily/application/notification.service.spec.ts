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
import { PushDeviceRepository } from 'src/user/domain/repository/push-device.repository';
import { PushDevice } from 'src/user/domain/model/push-device.entity';

describe('Daily question notification', () => {
  const send = jest.fn();
  const devices = {
    enabled: jest.fn(),
    delivered: jest.fn(),
    recordDelivery: jest.fn(),
    retire: jest.fn(),
  };
  const service = new NotificationService(
    {} as ConfigService,
    devices as unknown as PushDeviceRepository,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    (getMessaging as jest.Mock).mockReturnValue({ send });
    send.mockResolvedValue('message');
    devices.enabled.mockResolvedValue([]);
    devices.delivered.mockResolvedValue([]);
    devices.recordDelivery.mockResolvedValue(undefined);
    devices.retire.mockResolvedValue(undefined);
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
  it('keeps Android enabled when legacy iOS logs out and disables its slot', async () => {
    devices.enabled.mockResolvedValue([
      { token: 'android-token' } as PushDevice,
    ]);
    await service.sendDailyQuestionAlert(
      { id: '1', fcmToken: 'ios-token', notificationEnabled: false } as User,
      '10',
      '질문',
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'android-token' }),
    );
  });
  it('sends to legacy iOS and Android without duplicate token delivery', async () => {
    devices.enabled.mockResolvedValue([
      { token: 'android-token' },
      { token: 'ios-token' },
    ]);
    await service.sendDailyQuestionAlert(
      { id: '1', fcmToken: 'ios-token', notificationEnabled: true } as User,
      '10',
      '질문',
    );
    expect(send).toHaveBeenCalledTimes(2);
    expect(devices.recordDelivery).toHaveBeenCalledTimes(2);
  });
  it('retries a failed device without re-sending to a successful iOS device', async () => {
    const stored: string[] = [];
    devices.enabled.mockResolvedValue([
      { token: 'ios-token' },
      { token: 'android-token' },
    ]);
    devices.delivered.mockImplementation(() => Promise.resolve(stored));
    devices.recordDelivery.mockImplementation(
      (_cycle: string, hash: string) => {
        stored.push(hash);
        return Promise.resolve();
      },
    );
    send
      .mockResolvedValueOnce('sent')
      .mockRejectedValueOnce({ code: 'messaging/server-unavailable' });
    const user = {
      id: '1',
      fcmToken: null,
      notificationEnabled: false,
    } as User;
    await expect(
      service.sendDailyQuestionAlert(user, '10', '질문'),
    ).rejects.toThrow('retry');
    send.mockClear();
    await expect(
      service.sendDailyQuestionAlert(user, '10', '질문'),
    ).resolves.toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'android-token' }),
    );
  });
  it('retires only the invalid token and continues delivering to another device', async () => {
    devices.enabled.mockResolvedValue([
      { token: 'expired' },
      { token: 'valid' },
    ]);
    send
      .mockRejectedValueOnce({
        code: 'messaging/registration-token-not-registered',
      })
      .mockResolvedValueOnce('sent');
    await expect(
      service.sendDailyQuestionAlert(
        { id: '1', notificationEnabled: false } as User,
        '10',
        '질문',
      ),
    ).resolves.toBe(true);
    expect(devices.retire).toHaveBeenCalledWith('1', 'expired');
    expect(send).toHaveBeenCalledTimes(2);
  });
});
