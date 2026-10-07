import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OptionalUserId } from 'src/auth/infrastructure/security/current-user.decorator';
import { OptionalJwtAuthGuard } from 'src/auth/infrastructure/security/optional-jwt-auth.guard';
import { IdPipe } from 'src/common/id.pipe';
import { PhilosopherService } from 'src/philosopher/application/philosopher.service';
import { PhilosophersResponse } from '../dto/philosophers-response.dto';
import { PostsResponse } from '../dto/posts-response.dto';
import { PostResponse } from '../dto/post-response.dto';

@ApiTags('철학자 관련 API')
@Controller('/api/philosophers')
@ApiBearerAuth()
@UseGuards(OptionalJwtAuthGuard)
export class PhilosopherController {
  constructor(private readonly philosopherService: PhilosopherService) {}

  @Get()
  @ApiOperation({ summary: '철학자 리스트 조회' })
  getPhilosopher(
    @OptionalUserId() userId?: string,
  ): Promise<PhilosophersResponse> {
    return this.philosopherService.getPhilosophers(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '철학자 포스트 목록 조회' })
  getPosts(
    @Param('id', IdPipe) id: string,
    @OptionalUserId() userId?: string,
  ): Promise<PostsResponse> {
    return this.philosopherService.getPhilosopher(id, userId);
  }

  @Get('post/:id')
  @ApiOperation({ summary: '철학자 포스트 상세 조회' })
  getPost(
    @Param('id', IdPipe) id: string,
    @OptionalUserId() userId?: string,
  ): Promise<PostResponse> {
    return this.philosopherService.getPost(id, userId);
  }
}
