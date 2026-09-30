import { OnboardingSession } from '../model/onboarding-session.entity';
import { User } from 'src/user/domain/model/user.entity';
export const ONBOARDING_SESSION_REPOSITORY = Symbol(
  'ONBOARDING_SESSION_REPOSITORY',
);
export interface OnboardingSessionRepository {
  lockUser(userId: string): Promise<User | null>;
  find(userId: string): Promise<OnboardingSession | null>;
  save(session: OnboardingSession): Promise<void>;
}
