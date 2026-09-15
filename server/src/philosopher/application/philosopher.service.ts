import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PhilosophersResponse } from "../presentation/dto/philosophers-response.dto";
import { PostsResponse } from "../presentation/dto/posts-response.dto";
import { PostResponse } from "../presentation/dto/post-response.dto";
import { PHILOSOPHER_REPOSITORY, type PhilosopherRepository } from "../domain/repository/philosopher.repository";
import { USER_REPOSITORY, type UserRepository } from "src/user/domain/repository/user.repository";
import { User } from "src/user/domain/model/user.entity";
import { USER_PHILOSOPHER_COUNT_REPOSITORY, type UserPhilosopherCountRepository } from "../domain/repository/user-philosopher-count.repository";
import { POST_REPOSITORY, type PostRepository } from "../domain/repository/post.repository";
import { POST_SEGMENT_REPOSITORY, type PostSegmentRepository } from "../domain/repository/post-segment.repository";

@Injectable()
export class PhilosopherService {
    constructor(
        @Inject(POST_SEGMENT_REPOSITORY)
        private readonly postSegmentRepository: PostSegmentRepository,
        @Inject(POST_REPOSITORY)
        private readonly postRepository:PostRepository,
        @Inject(PHILOSOPHER_REPOSITORY)
        private readonly philosopherRepository:PhilosopherRepository,
        @Inject(USER_REPOSITORY)
        private readonly userRepository:UserRepository,
        @Inject(USER_PHILOSOPHER_COUNT_REPOSITORY)
        private readonly userPhilosopherCountRepository:UserPhilosopherCountRepository
    ){}

    async getPhilosophers(userId: string):Promise<PhilosophersResponse>{
        const user = await this.getUserOrThrow(userId);
        const philosophers = await this.philosopherRepository.findAll();
        const counts = await this.userPhilosopherCountRepository.findByUserId(user.id);
        const totalCount = counts.reduce((sum, item) => sum + item.count, 0);
        const countById = new Map(counts.map((item) => [item.philosopherId, item.count]));
        const all = philosophers.map((philosopher) => ({
            philosopher,
            // TODO: 게시글 저장소 구현 후 철학자별 실제 게시글 수 집계값으로 교체한다.
            // 현재 0은 임시 값이며, DB에서 조회한 게시글 수가 아니다.
            postCount: 0,
        }));
        const nearest = totalCount === 0 ? [] : all
            .filter((item) => (countById.get(item.philosopher.id) ?? 0) > 0)
            .sort((a, b) =>
                (countById.get(b.philosopher.id) ?? 0) -
                (countById.get(a.philosopher.id) ?? 0),
            )
            .slice(0, 1)
            .map((item) => ({
                ...item,
                closenessPercent: Math.round(
                    ((countById.get(item.philosopher.id) ?? 0) / totalCount) * 1000,
                ) / 10,
            }));
        return PhilosophersResponse.of(nearest, all);
    }

    async getPhilosopher(id:string):Promise<PostsResponse>{
         const philosopher = await this.philosopherRepository.findById(id);
         if(!philosopher){
            throw new NotFoundException('철학자를 찾을 수 없습니다.');
         }

         const posts = await this.postRepository.findByPhilosopherId(philosopher.id);

        return PostsResponse.of(philosopher, posts);
    }

    async getPost(id:string):Promise<PostResponse>{
        const post = await this.postRepository.findById(id);
        if(!post){
            throw new NotFoundException('해당 게시글을 찾을 수 없습니다');
        }

        const segments = await this.postSegmentRepository.findByPostId(post.id);
        return PostResponse.from(post, segments);
    }

    // ======================= 메서드 ======================= //
      // 1. (UUID) userId -> User 조회
      private async getUserOrThrow(userId: string): Promise<User> {
        // 외부에 노출되는 UUID 필드로 조회한다. DB 기본키 조회와 구분해야 한다.
        const user = await this.userRepository.findByUserId(userId);
        // 조회 결과가 없으면 Nest가 HTTP 404로 처리할 예외를 던진다.
        if (!user) {
          throw new NotFoundException('유저를 찾을 수 없습니다.');
        }
        return user;
      }
    
      // 2. (big int) userId -> User 조회
      private async findUserByIdOrThrow(id: string): Promise<User> {
        // DB 기본키(bigint)를 문자열로 전달받아 조회한다. 현재 목록 메서드에서는 사용하지 않는다.
        const user = await this.userRepository.findById(id);
        if (!user) {
          throw new NotFoundException('유저를 찾을 수 없습니다.');
        }
        return user;
      }

}
