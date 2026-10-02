import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, Equals } from 'class-validator';
import { AI_CONSENT_VERSION } from 'src/user/domain/ai-consent';
export class AiConsentRequest {
  @ApiProperty() @IsBoolean() enabled!: boolean;
  @ApiProperty({ enum: [AI_CONSENT_VERSION] })
  @Equals(AI_CONSENT_VERSION)
  version!: string;
}
