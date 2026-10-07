import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepository } from 'src/user/domain/repository/user.repository';
import { User } from '../../domain/model/user.entity';
import { Repository } from 'typeorm';
import { UserStatus } from 'src/user/domain/enum/user-status.enum';

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly ormRepository: Repository<User>,
  ) {}

  async findByUserId(userId: string, lock = false): Promise<User | null> {
    return await this.ormRepository.findOne({
      where: { userId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
  }

  async findById(id: string, lock = false): Promise<User | null> {
    return await this.ormRepository.findOne({
      where: { id },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
  }

  async save(user: User): Promise<void> {
    await this.ormRepository.save(user);
  }

  async softRemove(user: User): Promise<User> {
    return this.ormRepository.softRemove(user);
  }

  async findAllActive(): Promise<User[]> {
    return this.ormRepository.find({
      where: { userStatus: UserStatus.ACTIVE },
    });
  }
}
