import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('user_followup_answer')
export class UserFollowupAnswer extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint' })
  userId!: string;

  @Column({ type: 'bigint' })
  followupAnswerId!: string;

  @Column({ type: 'boolean' })
  isOnboarding!: boolean;

  @CreateDateColumn()
  answeredAt!: Date;

  // 비즈니스 로직
  // 1. 온보딩
  static onboarding(
    userId: string,
    followupAnswerId: string,
  ): UserFollowupAnswer {
    const ufa = new UserFollowupAnswer();
    ufa.userId = userId;
    ufa.followupAnswerId = followupAnswerId;
    ufa.isOnboarding = true;
    return ufa;
  }

  // 2. User followup Answer 생성
  static createUserFollowupAnswer(
    userId: string,
    followupAnswerId: string,
  ): UserFollowupAnswer {
    const ufa = new UserFollowupAnswer();
    ufa.userId = userId;
    ufa.followupAnswerId = followupAnswerId;
    ufa.isOnboarding = false;
    return ufa;
  }
}
