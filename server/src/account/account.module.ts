import { CREDENTIAL_CIPHER } from './domain/credential-cipher';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { RevocationJob } from './domain/model/revocation-job.entity';
import { ACCOUNT_STORE } from './domain/account-store';
import { REVOCATION_CLIENT } from './domain/revocation-client';
import { SqlAccountStore } from './infrastructure/account.store';
import { SocialRevocationClient } from './infrastructure/social-revocation.client';
import { CredentialVault } from './infrastructure/credential-vault';
import { AccountService } from './application/account.service';
import { AccountSchedulerService } from './application/account-scheduler.service';
import { AccountController } from './presentation/account.controller';
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([RevocationJob])],
  controllers: [AccountController],
  providers: [
    AccountService,
    AccountSchedulerService,
    { provide: CREDENTIAL_CIPHER, useClass: CredentialVault },
    { provide: ACCOUNT_STORE, useClass: SqlAccountStore },
    { provide: REVOCATION_CLIENT, useClass: SocialRevocationClient },
  ],
})
export class AccountModule {}
