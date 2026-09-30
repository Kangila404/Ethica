import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { AuthType } from '../enums/auth-Type.enum';

@Entity('auth_challenge')
export class AuthChallenge {
  @PrimaryColumn({ type: 'char', length: 36 })
  id!: string;

  @Column({ type: 'enum', enum: AuthType })
  provider!: AuthType;

  @Column({ type: 'varchar', length: 64 })
  nonce!: string;

  @Index()
  @Column({ type: 'datetime' })
  expiresAt!: Date;
}
