import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FollowupAnswer } from 'src/question/domain/model/followup-answer.entity';
import { FollowupAnswerRepository } from 'src/question/domain/repository/followup-answer.repository';
import { In, Repository } from 'typeorm';

@Injectable()
export class FollowupAnswerRepositoryImpl implements FollowupAnswerRepository {
  constructor(
    @InjectRepository(FollowupAnswer)
    private readonly ormRepository: Repository<FollowupAnswer>,
  ) {}

  async findById(id: string, lock = false): Promise<FollowupAnswer | null> {
    return this.ormRepository.findOne({
      where: { id },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
  }

  async findByIds(ids: string[]): Promise<FollowupAnswer[]> {
    return this.ormRepository.find({
      where: { id: In(ids) },
      order: { id: 'ASC' },
    });
  }
}
