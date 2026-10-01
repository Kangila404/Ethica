import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from 'src/common/Base.entity';
import { instantTransformer } from 'src/common/instant.transformer';
@Entity('social_revocation_job')
export class RevocationJob extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' }) id!: string;
  @Column({ type: 'bigint', unique: true }) userId!: string;
  @Column({ type: 'text', nullable: true, select: false })
  encryptedCredential!: string | null;
  @Index()
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: string;
  @Column({ type: 'int', default: 0 }) attempts!: number;
  @Column({ type: 'bigint', transformer: instantTransformer })
  nextAttemptAt!: Date;
  @Column({ type: 'char', length: 36, nullable: true }) leaseToken!:
    | string
    | null;
  @Column({ type: 'varchar', length: 50, nullable: true }) lastErrorCode!:
    | string
    | null;
}
