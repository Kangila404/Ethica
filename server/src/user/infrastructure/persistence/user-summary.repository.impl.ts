import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserSummary } from 'src/user/domain/model/user-summary.entity';
import { UserSummaryRepository } from 'src/user/domain/repository/user-summary.repository';
import { Repository } from 'typeorm';

@Injectable()
export class UserSummaryRepositoryImpl implements UserSummaryRepository {
  constructor(
    @InjectRepository(UserSummary)
    private readonly ormRepository: Repository<UserSummary>,
  ) {}

  async findByUserId(userId: string): Promise<UserSummary | null> {
    return this.ormRepository.findOne({ where: { userId } });
  }

  async save(userSummary: UserSummary): Promise<UserSummary> {
    return this.ormRepository.save(userSummary);
  }
}
