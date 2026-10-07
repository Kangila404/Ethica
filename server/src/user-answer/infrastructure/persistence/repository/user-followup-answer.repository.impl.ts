import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFollowupAnswer } from 'src/user-answer/domain/model/user-followup-answer.entity';
import { UserFollowupAnswerRepository } from 'src/user-answer/domain/repository/user-followup-answer.repository';

@Injectable()
export class UserFollowupAnswerRepositoryImpl implements UserFollowupAnswerRepository {
  constructor(
    @InjectRepository(UserFollowupAnswer)
    private readonly ormRepository: Repository<UserFollowupAnswer>,
  ) {}

  async save(entity: UserFollowupAnswer): Promise<UserFollowupAnswer> {
    return this.ormRepository.save(entity);
  }

  async findAllByUserId(userId: string): Promise<UserFollowupAnswer[]> {
    return this.ormRepository.find({
      where: { userId },
      order: { id: 'ASC' },
    });
  }
}
