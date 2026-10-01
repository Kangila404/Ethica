import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AnswerRepository } from 'src/question/domain/repository/answer.repository';
import { Answer } from 'src/question/domain/model/answer.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class AnswerRepositoryImpl implements AnswerRepository {
  constructor(
    @InjectRepository(Answer)
    private readonly ormRepository: Repository<Answer>,
  ) {}

  async findById(id: string, lock = false): Promise<Answer | null> {
    return this.ormRepository.findOne({
      where: { id },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
  }

  async findByIds(ids: string[]): Promise<Answer[]> {
    return this.ormRepository.find({
      where: { id: In(ids) },
    });
  }
}
