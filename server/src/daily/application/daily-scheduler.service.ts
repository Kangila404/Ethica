import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  USER_REPOSITORY,
  type UserRepository,
} from 'src/user/domain/repository/user.repository';
import { OnboardingStatus } from 'src/user/domain/enum/OnboardingStatus.enum';
import { DailyService } from './daily.service';
import { NotificationService } from './notification.service';

@Injectable()
export class DailySchedulerService {
  private readonly logger = new Logger(DailySchedulerService.name);
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly daily: DailyService,
    private readonly notifications: NotificationService,
  ) {}

  @Cron('* * * * *', { waitForCompletion: true })
  async tick(): Promise<void> {
    for (const user of await this.users.findAllActive()) {
      if (user.onboardingStatus !== OnboardingStatus.COMPLETE) continue;
      try {
        await this.daily.assignForToday(user.userId);
        const claim = await this.daily.claimNotification(user.userId);
        if (!claim) continue;
        let outcome: 'sent' | 'pending' | 'skipped' = 'pending';
        try {
          outcome = (await this.notifications.sendDailyQuestionAlert(
            claim.user,
            claim.cycleId,
            claim.questionBody,
          ))
            ? 'sent'
            : 'skipped';
        } catch {
          this.logger.warn('Daily push failed; retry scheduled');
        }
        await this.daily.finishNotification(
          user.userId,
          claim.cycleId,
          claim.token,
          outcome,
        );
      } catch {
        this.logger.warn('Daily cycle failed; continuing with remaining users');
      }
    }
  }
}
