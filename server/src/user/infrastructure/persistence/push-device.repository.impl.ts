import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { PushDevice } from '../../domain/model/push-device.entity';
import { PushDeviceRepository } from '../../domain/repository/push-device.repository';

@Injectable()
export class PushDeviceRepositoryImpl implements PushDeviceRepository {
  constructor(
    private readonly db: DataSource,
    @InjectRepository(PushDevice)
    private readonly devices: Repository<PushDevice>,
  ) {}

  async register(device: PushDevice): Promise<void> {
    // Token rotation/account switching must atomically detach the previous owner.
    // Unique indexes also serialize competing claims of the same device/token.
    for (let attempt = 0; ; attempt++) {
      try {
        await this.db.transaction(async (manager) => {
          await manager.query(
            'DELETE FROM push_devices WHERE tokenHash = ? AND installationId <> ?',
            [device.tokenHash, device.installationId],
          );
          await manager.query(
            `INSERT INTO push_devices (installationId, userId, platform, token, tokenHash, enabled)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE userId=VALUES(userId), platform=VALUES(platform),
               token=VALUES(token), tokenHash=VALUES(tokenHash), enabled=VALUES(enabled), updatedAt=CURRENT_TIMESTAMP(6)`,
            [
              device.installationId,
              device.userId,
              device.platform,
              device.token,
              device.tokenHash,
              device.enabled,
            ],
          );
          // Preserve other legacy iOS tokens; remove only this exact migrated token.
          await manager.query(
            'UPDATE users SET fcmToken = NULL WHERE BINARY fcmToken = ?',
            [device.token],
          );
        });
        return;
      } catch (error: unknown) {
        const code = (error as { driverError?: { code?: string } }).driverError
          ?.code;
        if (
          attempt >= 2 ||
          !['ER_LOCK_DEADLOCK', 'ER_DUP_ENTRY'].includes(code ?? '')
        )
          throw error;
      }
    }
  }

  find(userId: string, installationId: string): Promise<PushDevice | null> {
    return this.devices.findOne({ where: { userId, installationId } });
  }
  async remove(userId: string, installationId: string): Promise<void> {
    await this.devices.delete({ userId, installationId });
  }
  enabled(userId: string): Promise<PushDevice[]> {
    return this.devices
      .createQueryBuilder('device')
      .addSelect(['device.token', 'device.tokenHash'])
      .where('device.userId = :userId AND device.enabled = true', { userId })
      .getMany();
  }
  async retire(userId: string, token: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.db.transaction(async (manager) => {
      await manager.delete(PushDevice, { userId, tokenHash });
      await manager.query(
        'UPDATE users SET fcmToken = NULL WHERE id = ? AND BINARY fcmToken = ?',
        [userId, token],
      );
    });
  }
  async delivered(cycleId: string): Promise<string[]> {
    const rows = await this.db.query<Array<{ tokenHash: string }>>(
      'SELECT tokenHash FROM push_deliveries WHERE cycleId = ?',
      [cycleId],
    );
    return rows.map((row) => row.tokenHash);
  }
  async recordDelivery(cycleId: string, tokenHash: string): Promise<void> {
    await this.db.query(
      'INSERT IGNORE INTO push_deliveries (cycleId, tokenHash) VALUES (?, ?)',
      [cycleId, tokenHash],
    );
  }
}
