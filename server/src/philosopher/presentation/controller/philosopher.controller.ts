import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUserId } from "src/auth/infrastructure/security/current-user.decorator";
import { JwtAuthGuard } from "src/auth/infrastructure/security/jwt-auth.guard";
import { PhilosopherService } from "src/philosopher/application/philosopher.service";
import { PhilosophersResponse } from "../dto/philosophers-response.dto";
import { PostsResponse } from "../dto/posts-response.dto";
import { PostResponse } from "../dto/post-response.dto";

@ApiTags("철학자 관련 API")
@Controller("/api/philosophers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PhilosopherController {
 
    constructor(
        private readonly philosopherService:PhilosopherService 
    ){}

    @Get()
    @ApiOperation({summary: "철학자 리스트 조회"})
    getPhilosopher(@CurrentUserId() userId: string): Promise<PhilosophersResponse>{
        return this.philosopherService.getPhilosophers(userId);
    }

    @Get(":id")
    @ApiOperation({summary: "철학자 포스트 목록 조회"})
    getPosts(@Param("id") id: string): Promise<PostsResponse>{
        return this.philosopherService.getPhilosopher(id);
    }

    @Get("post/:id")
    @ApiOperation({summary: "철학자 포스트 상세 조회"})
    getPost(@Param("id") id: string): Promise<PostResponse>{
        return this.philosopherService.getPost(id);
    }

}
