import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuestionUsage } from 'src/question/domain/enum/question-usage.enum';
import { Question } from 'src/question/domain/model/question.entity';
import { QuestionRepository } from 'src/question/domain/repository/question.repository';
import { In, Repository } from 'typeorm';

@Injectable()
export class QuestionRepositoryImpl implements QuestionRepository {
  constructor(
    @InjectRepository(Question)
    private readonly ormRepository: Repository<Question>,
  ) {}

  async findById(id: string, lock = false): Promise<Question | null> {
    return this.ormRepository.findOne({
      where: { id },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
  }

  async findByIds(ids: string[]): Promise<Question[]> {
    return this.ormRepository.find({ where: { id: In(ids) } });
  }

  async findOnboardingByCategory(
    categoryId: string,
    limit: number,
  ): Promise<Question[]> {
    // Select root IDs before loading choices: pagination across answer joins
    // can otherwise consume the limit with multiple rows of the same question.
    const selected = await this.ormRepository
      .createQueryBuilder('q')
      .innerJoin('q.categories', 'qc', 'qc.categoryId = :categoryId', {
        categoryId,
      })
      .where('q.usage = :usage', { usage: QuestionUsage.ONBOARDING })
      .andWhere('q.isActive = true')
      .orderBy('q.id', 'ASC')
      .take(limit)
      .getMany();
    if (!selected.length) return [];
    return this.ormRepository.find({
      where: { id: In(selected.map((q) => q.id)) },
      relations: { answers: true, followupAnswers: true, categories: true },
      order: {
        id: 'ASC',
        answers: { id: 'ASC' },
        followupAnswers: { id: 'ASC' },
      },
    });
  }

  async findByIdWithAnswers(
    questionId: string,
    lock = false,
  ): Promise<Question | null> {
    return this.ormRepository.findOne({
      where: { id: questionId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
      relations: {
        answers: true,
        followupAnswers: true,
        categories: true,
      },
    });
  }

  async findRandomDailyExcluding(
    excludeIds: string[],
  ): Promise<Question | null> {
    const qb = this.ormRepository
      .createQueryBuilder('q')
      .where('q.usage = :usage', { usage: QuestionUsage.DAILY })
      .andWhere('q.isActive = true');

    if (excludeIds.length > 0) {
      qb.andWhere('q.id NOT IN (:...excludeIds)', { excludeIds });
    }

    qb.andWhere(
      '(SELECT COUNT(*) FROM answer a WHERE a.questionId = q.id) = 2',
    );
    qb.andWhere(
      "(q.type = 'single' OR (q.followupBody IS NOT NULL AND (SELECT COUNT(*) FROM followup_answer f WHERE f.questionId = q.id) = 2))",
    );
    return qb.orderBy('RAND()').limit(1).getOne();
  }
}
