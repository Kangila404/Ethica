import { PostSegment } from "src/philosopher/domain/model/post-segment.entity";
import { Post } from "src/philosopher/domain/model/post.entity";

export class PostResponse {
    id!:string;
    philosopherId!:string;
    title!:string;
    imageKey!:string | null;
    segments!: PostSegmentInfo[];

    static from(post:Post, segments: PostSegment[]):PostResponse{
        const dto = new PostResponse();
        dto.id = post.id;
        dto.philosopherId = post.philosopherId;
        dto.title = post.title;
        dto.imageKey = post.imageKey;
        dto.segments = segments
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((segment) => PostSegmentInfo.from(segment));
        return dto;
    }
}

class PostSegmentInfo {
    id!:string;
    segmentType!: 'text' | 'image';
    body!: string | null;
    imageKey!: string | null;
    sortOrder!: number;

    static from(segment: PostSegment): PostSegmentInfo {
        const dto = new PostSegmentInfo();
        dto.id = segment.id;
        dto.segmentType = segment.segmentType;
        dto.body = segment.body;
        dto.imageKey = segment.imageKey;
        dto.sortOrder = segment.sortOrder;
        return dto;
    }
}

