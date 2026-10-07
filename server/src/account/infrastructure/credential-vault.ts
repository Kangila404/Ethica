import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
@Injectable()
export class CredentialVault {
  constructor(private readonly config: ConfigService) {}
  private key(): Buffer {
    const raw = this.config.get<string>('SOCIAL_TOKEN_ENCRYPTION_KEY') ?? '';
    if (!/^[a-fA-F0-9]{64}$/.test(raw))
      throw new ServiceUnavailableException({
        code: 'SOCIAL_REVOCATION_NOT_CONFIGURED',
        message: '소셜 연결 해제 설정이 필요합니다.',
      });
    return Buffer.from(raw, 'hex');
  }
  assertConfigured() {
    this.key();
  }
  encrypt(value: string): string {
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
      'base64',
    );
  }
  decrypt(value: string): string {
    const bytes = Buffer.from(value, 'base64'),
      decipher = createDecipheriv(
        'aes-256-gcm',
        this.key(),
        bytes.subarray(0, 12),
      );
    decipher.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([
      decipher.update(bytes.subarray(28)),
      decipher.final(),
    ]).toString('utf8');
  }
}
