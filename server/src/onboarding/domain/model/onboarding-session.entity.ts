import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('onboarding_session')
export class OnboardingSession {
  @PrimaryColumn({ type: 'bigint' }) userId!: string;
  @Column({ type: 'json' }) questionIds!: string[];
  @Column({ type: 'int', default: 0 }) completedCount = 0;
  @Column({ type: 'bigint', nullable: true }) draftAnswerId: string | null =
    null;
  @Column({ type: 'boolean', default: false }) resultRequested = false;
}
