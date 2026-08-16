import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Generated,
  DeleteDateColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/Base.entity';
import { UserRole } from '../enum/user-role.enum';
import { UserStatus } from '../enum/user-status.enum';
import { OnboardingStatus } from '../enum/OnboardingStatus.enum';

@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'char', length: 36, unique: true })
  @Generated('uuid')
  userId!: string;

  @Column({ type: 'varchar', length: 10 })
  name!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  userRole!: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  userStatus!: UserStatus;

  @Column({
    type: 'enum',
    enum: OnboardingStatus,
    default: OnboardingStatus.INCOMPLETE,
  })
  onboardingStatus!: OnboardingStatus;

  @Column({ type: 'boolean', default: true })
  notificationEnabled!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fcmToken!: string | null;

  @Column({ type: 'bigint', nullable: true })
  interestCategoryId!: string | null;

  @Column({ type: 'time', nullable: true })
  dailyQuestionTime!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone!: string;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt!: Date | null;

  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date | null;

  // 비즈니스 로직
  // 1. 닉네임 변경
  changeName(name: string): void {
    this.name = name;
  }

  // 2. 위젯 시간 등록
  changeDailyTime(dailyQuestionTime: string, timezone: string): void {
    this.dailyQuestionTime = dailyQuestionTime;
    this.timezone = timezone;
  }

  // 3. 위젯 시간 업데이트
  updateDailyTime(dailyQuestionTime: string, timezone: string): void {
    this.dailyQuestionTime = dailyQuestionTime;
    this.timezone = timezone;
  }

  // 4. 유저 탈퇴(soft delete)
  withdraw(): void {
    this.userStatus = UserStatus.SUSPENDED;
    this.notificationEnabled = false;
  }

  // 5. 알림 활성화/비활성화
  updateNotification(notificationEnabled: boolean): void {
    this.notificationEnabled = notificationEnabled;
  }

  // 6. Local 회원가입
  static create(name: string): User {
    const user = new User();
    user.name = name;
    return user;
  }

  // 7. 카테고리 선택
  selectInterestCategory(categoryId: string): void {
    this.interestCategoryId = categoryId;
  }

  // 8. 온보딩 상태 변경
  completeOnboarding(): void {
    if (this.onboardingStatus === OnboardingStatus.COMPLETE) {
    throw new Error('이미 온보딩을 완료한 유저입니다.');
  }
    this.onboardingStatus = OnboardingStatus.COMPLETE;
  }
}
