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
    async findById(id:string): Promise<User | null>{
        return await this.ormRepository.findOne({ where: {id}});
    }
}