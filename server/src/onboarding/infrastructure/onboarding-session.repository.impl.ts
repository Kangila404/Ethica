import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/domain/model/user.entity';
import { OnboardingSession } from '../domain/model/onboarding-session.entity';
import { OnboardingSessionRepository } from '../domain/repository/onboarding-session.repository';
@Injectable()
export class OnboardingSessionRepositoryImpl implements OnboardingSessionRepository {
  constructor(
    @InjectRepository(OnboardingSession)
    private readonly sessions: Repository<OnboardingSession>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}
  lockUser(userId: string): Promise<User | null> {
    return this.users.findOne({
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });
  }
  find(userId: string): Promise<OnboardingSession | null> {
    return this.sessions.findOneBy({ userId });
  }
  async save(session: OnboardingSession): Promise<void> {
    await this.sessions.save(session);
  }
}
