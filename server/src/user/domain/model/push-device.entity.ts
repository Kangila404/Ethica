import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PushPlatform = 'ios' | 'android';

@Entity('push_devices')
export class PushDevice {
  @PrimaryColumn({ type: 'char', length: 36 })
  installationId!: string;

  @Index()
  @Column({ type: 'bigint' })
  userId!: string;

  @Column({ type: 'varchar', length: 16 })
  platform!: PushPlatform;

  @Column({ type: 'varchar', length: 2048, select: false })
  token!: string;

  @Index({ unique: true })
  @Column({ type: 'char', length: 64, select: false })
  tokenHash!: string;

  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updatedAt!: Date;
}
