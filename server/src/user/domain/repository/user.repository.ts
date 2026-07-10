import { User } from '../model/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
    // 외부 노출용 userId
    findByUserId(userId:string): Promise<User | null>;

    // 내부 통신용 id
    findById(id:string): Promise<User | null>;

    save(user:User): Promise<void>;

    softRemove(user:User): Promise<User>;
}