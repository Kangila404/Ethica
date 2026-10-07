import { Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUserId,
  OptionalUserId,
} from 'src/auth/infrastructure/security/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/infrastructure/security/jwt-auth.guard';
import { OptionalJwtAuthGuard } from 'src/auth/infrastructure/security/optional-jwt-auth.guard';
import { IdPipe } from 'src/common/id.pipe';
import { PostLikeService } from '../../application/post-like.service';

@ApiTags('Learning likes')
@Controller('/api/philosophers/post/:id/like')
export class PostLikeController {
  constructor(private readonly service: PostLikeService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '공개 글 좋아요 수 / 로그인 시 내 좋아요 상태' })
  state(@Param('id', IdPipe) id: string, @OptionalUserId() userId?: string) {
    return this.service.state(id, userId);
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 좋아요 등록 (멱등)' })
  like(@Param('id', IdPipe) id: string, @CurrentUserId() userId: string) {
    return this.service.set(id, userId, true);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 좋아요 취소 (멱등)' })
  unlike(@Param('id', IdPipe) id: string, @CurrentUserId() userId: string) {
    return this.service.set(id, userId, false);
  }
}
