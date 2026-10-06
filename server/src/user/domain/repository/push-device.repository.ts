import { PushDevice } from '../model/push-device.entity';

export const PUSH_DEVICE_REPOSITORY = Symbol('PUSH_DEVICE_REPOSITORY');
export interface PushDeviceRepository {
  register(device: PushDevice): Promise<void>;
  find(userId: string, installationId: string): Promise<PushDevice | null>;
  remove(userId: string, installationId: string): Promise<void>;
  enabled(userId: string): Promise<PushDevice[]>;
  retire(userId: string, token: string): Promise<void>;
  delivered(cycleId: string): Promise<string[]>;
  recordDelivery(cycleId: string, tokenHash: string): Promise<void>;
}
