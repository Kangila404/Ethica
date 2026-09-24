import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/infrastructure/security/jwt-auth.guard";
import { ArchiveService } from "../../application/archive.service";
import { CurrentUserId } from "src/auth/infrastructure/security/current-user.decorator";
import { ArchiveListResponse } from "../dto/res/archive.response.dto";
import { ArchiveDetailResponse } from "../dto/res/archive-detail-response.dto";

@ApiTags('아카이브(유저 대답 정보) API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('/api/archive')
export class ArchiveController{
    constructor(
        private readonly archiveService:ArchiveService
    ){}

    @Get()
    @ApiOperation({summary : "내 대답 목록 조회"})
    @ApiOkResponse({ type: ArchiveListResponse, description: '보관함 목록 조회 성공' })
    getUserAnswers(
        @CurrentUserId() userId:string
    ):Promise<ArchiveListResponse>
    {
        return this.archiveService.getUserAnswers(userId);
    }

    @Get(':userAnswerId')
    @ApiOperation({summary: '유저 대답 상세 조회'})
    @ApiParam({ name: 'userAnswerId', example: '5012', description: '조회할 사용자 답변 ID' })
    @ApiOkResponse({ type: ArchiveDetailResponse, description: '보관함 상세 조회 성공' })
    getUserAnswer(
        @CurrentUserId() userId:string,
        @Param('userAnswerId') userAnswerId:string
    ):Promise<ArchiveDetailResponse>{
        return this.archiveService.getUserAnswer(userId, userAnswerId);
    }



}
