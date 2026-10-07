import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  PUSH_DEVICE_REPOSITORY,
  type PushDeviceRepository,
} from '../domain/repository/push-device.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../domain/repository/user.repository';
import { PushDevice } from '../domain/model/push-device.entity';
import { RegisterPushDeviceRequest } from '../presentation/dto/req/register-push-device-request.dto';
import { UserStatus } from '../domain/enum/user-status.enum';

@Injectable()
export class PushDeviceService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PUSH_DEVICE_REPOSITORY)
    private readonly devices: PushDeviceRepository,
  ) {}
  private async userId(externalId: string): Promise<string> {
    const user = await this.users.findByUserId(externalId);
    if (!user || user.userStatus !== UserStatus.ACTIVE)
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user.id;
  }
  async register(
    externalId: string,
    installationId: string,
    input: RegisterPushDeviceRequest,
  ) {
    const device = Object.assign(new PushDevice(), {
      installationId,
      userId: await this.userId(externalId),
      platform: input.platform,
      token: input.fcmToken,
      tokenHash: createHash('sha256').update(input.fcmToken).digest('hex'),
      enabled: input.enabled,
    });
    await this.devices.register(device);
    return {
      installationId,
      platform: device.platform,
      enabled: device.enabled,
    };
  }
  async get(externalId: string, installationId: string) {
    const device = await this.devices.find(
      await this.userId(externalId),
      installationId,
    );
    return {
      installationId,
      registered: !!device,
      enabled: device?.enabled ?? false,
      platform: device?.platform ?? null,
    };
  }
  async remove(externalId: string, installationId: string): Promise<void> {
    await this.devices.remove(await this.userId(externalId), installationId);
  }
}
