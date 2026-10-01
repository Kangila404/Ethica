import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  AUTH_CHALLENGE_REPOSITORY,
  type AuthChallengeRepository,
} from 'src/auth/domain/repository/auth-challenge.repository';
import {
  SOCIAL_TOKEN_VERIFIER,
  type SocialTokenVerifier,
} from 'src/auth/domain/client/social-token-verifier';
import { ACCOUNT_STORE, type AccountStore } from '../domain/account-store';
import {
  REVOCATION_CLIENT,
  type RevocationClient,
} from '../domain/revocation-client';
import {
  CREDENTIAL_CIPHER,
  type CredentialCipher,
} from '../domain/credential-cipher';
import { WithdrawalRequest } from '../presentation/withdrawal.dto';
@Injectable()
export class AccountService {
  constructor(
    @Inject(ACCOUNT_STORE) private readonly store: AccountStore,
    @Inject(AUTH_CHALLENGE_REPOSITORY)
    private readonly challenges: AuthChallengeRepository,
    @Inject(SOCIAL_TOKEN_VERIFIER)
    private readonly verifier: SocialTokenVerifier,
    @Inject(REVOCATION_CLIENT) private readonly revoker: RevocationClient,
    @Inject(CREDENTIAL_CIPHER) private readonly vault: CredentialCipher,
  ) {}
  async withdraw(userId: string, input: WithdrawalRequest) {
    this.vault.assertConfigured();
    const identity = await this.store.identity(userId);
    const challenge = await this.challenges.findValid(input.challengeId);
    if (
      !challenge ||
      challenge.provider !== input.provider ||
      identity.authType !== input.provider
    )
      throw new UnauthorizedException('재인증 제공자가 일치하지 않습니다.');
    const profile = await this.verifier.verify(
      input.provider,
      input.idToken,
      challenge.nonce,
    );
    if (profile.subject !== identity.providerUid)
      throw new UnauthorizedException('현재 계정으로 다시 인증해주세요.');
    const credential = await this.revoker.prepare(
      input.provider,
      profile.subject,
      input.credential,
      challenge.nonce,
    );
    const encrypted = this.vault.encrypt(JSON.stringify(credential));
    await this.store.withdraw(userId, identity.id, challenge.id, encrypted);
    return { message: 'success', revocationStatus: 'pending' };
  }
  async jobs(after?: string) {
    return (await this.store.jobs(after)).map((job) => ({
      id: job.id,
      status: job.status,
      attempts: job.attempts,
      nextAttemptAt: job.nextAttemptAt,
      lastErrorCode: job.lastErrorCode,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));
  }
  retry(id: string) {
    return this.store.retry(id);
  }
}
