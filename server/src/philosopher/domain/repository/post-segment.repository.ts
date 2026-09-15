import { PostSegment } from "../model/post-segment.entity";

export const POST_SEGMENT_REPOSITORY = Symbol('POST_SEGMENT_REPOSITORY');

export interface PostSegmentRepository {
    findByPostId(postId:string):Promise<PostSegment[]>;
}