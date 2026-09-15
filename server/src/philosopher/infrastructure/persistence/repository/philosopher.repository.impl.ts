import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Philosopher } from 'src/philosopher/domain/model/philosopher.entity';
import { PhilosopherRepository } from 'src/philosopher/domain/repository/philosopher.repository';
import { Repository } from 'typeorm';

@Injectable()
export class PhilosopherRepositoryImpl implements PhilosopherRepository {
  constructor(
    @InjectRepository(Philosopher)
    private readonly ormRepository: Repository<Philosopher>,
  ) {}

  async findById(id: string): Promise<Philosopher | null> {
    return this.ormRepository.findOne({
      where: { id },
    });
  }

  async findAll(): Promise<Philosopher[]> {
    return this.ormRepository.find({
      order: {
        id: 'ASC',
      },
    });
  }
}
