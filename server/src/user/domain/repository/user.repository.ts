import { User } from '../model/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
    findById(userId:string): Promise<User | null>;

    save(user:User): Promise<void>;

    softRemove(user:User): Promise<User>;
}