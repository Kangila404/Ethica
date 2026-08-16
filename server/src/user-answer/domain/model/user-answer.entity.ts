import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('user_answer')
export class UserAnswer extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'bigint' })
  answerId!: string;

  @Column({ type: 'boolean' })
  isOnboarding!: boolean;

  @CreateDateColumn()
  answeredAt!: Date;

  // 비즈니스 로직
  // 1. 온보딩
  static onboarding(userId: string, answerId: string): UserAnswer {
    const ua = new UserAnswer();
    ua.userId = userId;
    ua.answerId = answerId;
    ua.isOnboarding = true;
    return ua;
  }

  // 2. 유저 답 생성
  static createUserStageOneAnswer(
    userId: string,
    answerId: string,
  ): UserAnswer {
    const ua = new UserAnswer();
    ua.userId = userId;
    ua.answerId = answerId;
    ua.isOnboarding = false;
    return ua;
  }
}
