import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepository } from 'src/user/domain/repository/user.repository';
import { User } from '../../domain/model/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserRepositoryImpl implements UserRepository {
    constructor(
        @InjectRepository(User)
        private readonly ormRepository: Repository<User>,
    ){}
    
    // findById
    async findById(userId:string): Promise<User | null>{
        return await this.ormRepository.findOne({ where: {userId}});
    }

    async save(user:User): Promise<void>{
        await this.ormRepository.save(user);
    }

    async softRemove(user:User): Promise<User>{
        return this.ormRepository.softRemove(user);
    }
}