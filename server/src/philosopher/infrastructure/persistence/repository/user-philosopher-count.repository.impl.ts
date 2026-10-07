import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserPhilosopherCount } from 'src/philosopher/domain/model/user-philosopher-count.entity';
import { UserPhilosopherCountRepository } from 'src/philosopher/domain/repository/user-philosopher-count.repository';
import { Repository } from 'typeorm';

@Injectable()
export class UserPhilosopherCountRepositoryImpl implements UserPhilosopherCountRepository {
  constructor(
    @InjectRepository(UserPhilosopherCount)
    private readonly ormRepository: Repository<UserPhilosopherCount>,
  ) {}

  async increase(userId: string, philosopherId: string): Promise<void> {
    const result = await this.ormRepository.increment(
      { userId, philosopherId },
      'count',
      1,
    );

    if (result.affected && result.affected > 0) {
      return;
    }

    try {
      await this.ormRepository.save(
        UserPhilosopherCount.initial(userId, philosopherId),
      );
    } catch (e: unknown) {
      if (!this.isDuplicateEntryError(e)) {
        throw e;
      }

      await this.ormRepository.increment({ userId, philosopherId }, 'count', 1);
    }
  }

  async findByUserId(userId: string): Promise<UserPhilosopherCount[]> {
    return this.ormRepository.find({
      where: { userId },
      order: { count: 'DESC', id: 'ASC' },
    });
  }

  private isDuplicateEntryError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'ER_DUP_ENTRY'
    );
  }
}
