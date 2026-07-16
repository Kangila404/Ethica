import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAnswer } from 'src/user-answer/domain/model/user-answer.entity';
import { UserAnswerRepository } from 'src/user-answer/domain/repository/user-answer.repository';
import { Repository } from 'typeorm';

@Injectable()
export class UserAnswerRepositoryImpl implements UserAnswerRepository {
  constructor(
    @InjectRepository(UserAnswer)
    private readonly ormRepository: Repository<UserAnswer>,
  ) {}

  async save(userAnswer: UserAnswer): Promise<UserAnswer> {
    return this.ormRepository.save(userAnswer);
  }

  async countByUserId(userId: string, isOnboarding: boolean): Promise<number> {
    return this.ormRepository.count({ where: { userId, isOnboarding } });
  }

  async findByUserId(
    userId: string,
    isOnboarding: boolean,
  ): Promise<UserAnswer[]> {
    return this.ormRepository.find({
      where: { userId, isOnboarding },
      order: { id: 'ASC' },
    });
  }
}
