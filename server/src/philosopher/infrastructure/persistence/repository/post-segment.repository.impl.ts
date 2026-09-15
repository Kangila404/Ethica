import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PostSegment } from "src/philosopher/domain/model/post-segment.entity";
import { PostSegmentRepository } from "src/philosopher/domain/repository/post-segment.repository";
import { Repository } from "typeorm";


@Injectable()
export class PostSegmentRepositoryImpl implements PostSegmentRepository {
    constructor(
        @InjectRepository(PostSegment)
        private readonly ormRepository:Repository<PostSegment>,
    ){}
    
    async findByPostId(postId:string):Promise<PostSegment[]>{
        return this.ormRepository.find({
            where:{postId},
            order: {sortOrder: 'ASC'},
        })
    }
}