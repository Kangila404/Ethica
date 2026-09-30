import { ApiProperty } from '@nestjs/swagger';
import { UserSummaryInsight } from 'src/user/domain/model/user-summary.entity';
class Insight {
  @ApiProperty({
    type: [String],
    description: '보관함 상세로 이동할 본인 풀이 ID',
  })
  userAnswerIds!: string[];
  @ApiProperty() title!: string;
  @ApiProperty() summary!: string;
}
export class ContradictionResponse {
  @ApiProperty({ nullable: true, type: String }) nearestPhilosopherId!:
    | string
    | null;
  @ApiProperty({ nullable: true, type: String }) nearestPhilosopherName!:
    | string
    | null;
  @ApiProperty({ type: [Insight] }) overallSummaries!: UserSummaryInsight[];
  @ApiProperty({ type: [Insight] }) contradictions!: UserSummaryInsight[];
  @ApiProperty() accuracy!: number;
  @ApiProperty() accuracyDescription!: string;
  @ApiProperty({ enum: ['pending', 'processing', 'ready', 'failed'] }) status!:
    | 'pending'
    | 'processing'
    | 'ready'
    | 'failed';
  @ApiProperty() canRetry!: boolean;
  @ApiProperty({ nullable: true, type: String }) message!: string | null;
}
