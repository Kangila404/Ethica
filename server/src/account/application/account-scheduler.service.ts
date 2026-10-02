import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ACCOUNT_STORE, type AccountStore } from '../domain/account-store';
import {
  REVOCATION_CLIENT,
  type RevocationClient,
  type RevocationCredential,
} from '../domain/revocation-client';
import {
  CREDENTIAL_CIPHER,
  type CredentialCipher,
} from '../domain/credential-cipher';
@Injectable()
export class AccountSchedulerService {
  private readonly logger = new Logger(AccountSchedulerService.name);
  constructor(
    @Inject(ACCOUNT_STORE) private readonly store: AccountStore,
    @Inject(REVOCATION_CLIENT) private readonly revoker: RevocationClient,
    @Inject(CREDENTIAL_CIPHER) private readonly vault: CredentialCipher,
  ) {}
  @Cron('* * * * *', { waitForCompletion: true })
  async revokePending(): Promise<void> {
    for (let i = 0; i < 50; i++) {
      const job = await this.store.claim(new Date());
      if (!job) break;
      let success = false;
      try {
        const credential = JSON.parse(
          this.vault.decrypt(job.encryptedCredential!),
        ) as RevocationCredential;
        await this.revoker.revoke(credential);
        success = true;
      } catch {
        this.logger.warn('Social revocation failed; retained for retry');
      }
      await this.store.finish(job.id, job.leaseToken!, success, new Date());
    }
    await this.purgeWithdrawn();
  }
  @Cron('0 3 * * *', { timeZone: 'UTC', waitForCompletion: true })
  async purgeWithdrawn(): Promise<void> {
    // Legacy soft-deleted accounts: unlink first, then erase without a 2-year hold.
    const cutoff = new Date();
    // Bounded batches avoid a long transaction across the entire account table.
    for (let i = 0; i < 100; i++)
      if ((await this.store.purge(cutoff)) < 100) break;
  }
}
