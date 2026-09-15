import { Philosopher } from "src/philosopher/domain/model/philosopher.entity";

export class PostsResponse {
    id!:string;
    name!:string;
    era!:string;
    school!:string;
    coreThought!:string;
    lifeRoots!:string;
    imageKey!:string | null;
    posts!:PostInfo[];

    static of(philosopher: Philosopher, posts:PostInfo[]): PostsResponse {
        const dto = new PostsResponse();
        dto.id = philosopher.id;
        dto.name = philosopher.name;
        dto.era = philosopher.era;
        dto.school = philosopher.school;
        dto.coreThought = philosopher.coreThought;
        dto.lifeRoots = philosopher.lifeRoots;
        dto.imageKey = philosopher.imageKey
        dto.posts = posts;
        return dto;
    }
}

class PostInfo {
    id!:string;
    title!:string;
    imageKey!:string | null;
    }
