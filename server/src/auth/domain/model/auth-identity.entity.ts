import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { AuthType } from '../enums/auth-Type.enum';
import { BaseEntity } from 'src/common/Base.entity';

@Entity('auth_Identity')
@Unique(['authType', 'providerUid'])
export class AuthIdentity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint' })
  userId!: string;

  @Column({ type: 'enum', enum: AuthType })
  authType!: AuthType;

  @Column({ type: 'varchar', length: 255 })
  providerUid!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  static createSocial(
    userId: string,
    authType: AuthType,
    providerUid: string,
    email: string | null,
  ): AuthIdentity {
    const identity = new AuthIdentity();
    Object.assign(identity, { userId, authType, providerUid, email });
    return identity;
  }
}
