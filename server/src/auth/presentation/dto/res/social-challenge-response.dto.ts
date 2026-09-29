import { ApiProperty } from '@nestjs/swagger';
import { AuthChallenge } from '../../../domain/model/auth-challenge.entity';

export class SocialChallengeResponse {
  @ApiProperty({ format: 'uuid' })
  challengeId!: string;
  @ApiProperty({ description: '제공자 인증 요청의 nonce에 그대로 전달할 값' })
  nonce!: string;
  @ApiProperty({ description: 'UTC ISO 8601, 발급 후 5분' })
  expiresAt!: string;
  static from(challenge: AuthChallenge): SocialChallengeResponse {
    return {
      challengeId: challenge.id,
      nonce: challenge.nonce,
      expiresAt: challenge.expiresAt.toISOString(),
    };
  }
}
