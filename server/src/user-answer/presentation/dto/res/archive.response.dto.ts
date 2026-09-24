import { ApiProperty } from '@nestjs/swagger';

export class ArchiveListResponse {
    @ApiProperty({ type: () => [ArchiveItemResponse] })
    items!: ArchiveItemResponse[];

    @ApiProperty({ example: null, nullable: true })
    nextCursor!:string | null;

    static of(
    items: ArchiveItemResponse[],
    nextCursor: string | null = null,
  ): ArchiveListResponse {
    const response = new ArchiveListResponse();
    response.items = items;
    response.nextCursor = nextCursor;
    return response;
  }
}

export class ArchiveItemResponse {
    @ApiProperty({ example: '5031', description: '사용자 답변 ID' })
    userAnswerId!:string;

    @ApiProperty({ example: '2026-06-24', description: '답변한 날짜 (Asia/Seoul)' })
    serviceDate!:string;

    @ApiProperty({ example: '길에 쓰러진 지갑을 발견했다면 어떻게 할까요?' })
    questionPreview!:string;
}
