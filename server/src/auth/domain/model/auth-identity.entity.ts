import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { AuthType } from '../enums/auth-Type.enum';
import { BaseEntity } from 'src/common/Base.entity';

@Entity('auth_Identity')
@Unique(['authType', 'providerUid'])
@Unique(['authType', 'email'])
export class AuthIdentity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint' })
  userId!: string;

  @Column({ type: 'enum', enum: AuthType })
  authType!: AuthType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerUid!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password!: string | null;

  // 비즈니스 로직
  // 1. 로컬 유저 생성
  static createLocal(
    userId: string,
    email: string,
    hashedPassword: string,
  ): AuthIdentity {
    const identity = new AuthIdentity();
    identity.userId = userId;
    identity.authType = AuthType.LOCAL;
    identity.email = email;
    identity.password = hashedPassword;
    return identity;
  }

  // 2. 로컬 유저 확인
  isLocal(): this is AuthIdentity & { email: string; password: string } {
    return this.authType === AuthType.LOCAL && this.password !== null;
  }
}
