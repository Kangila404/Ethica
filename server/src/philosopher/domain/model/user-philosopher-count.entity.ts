import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('user_philosopher_count')
@Unique(['userId', 'philosopherId'])
export class UserPhilosopherCount extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'philosopher_id', type: 'bigint' })
  philosopherId!: string;

  @Column({ type: 'int', default: 0 })
  count!: number;

  static initial(userId: string, philosopherId: string): UserPhilosopherCount {
    const count = new UserPhilosopherCount();
    count.userId = userId;
    count.philosopherId = philosopherId;
    count.count = 1;
    return count;
  }
}
