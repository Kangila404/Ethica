import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuestionUsage } from 'src/question/domain/enum/question-usage.enum';
import { Question } from 'src/question/domain/model/question.entity';
import { QuestionRepository } from 'src/question/domain/repository/question.repository';
import { Repository } from 'typeorm';

@Injectable()
export class QuestionRepositoryImpl implements QuestionRepository {
  constructor(
    @InjectRepository(Question)
    private readonly ormRepository: Repository<Question>,
  ) {}

  async findById(id:string):Promise<Question | null>{
    return this.ormRepository.findOne({where : {id}});
  }

  async findOnboardingByCategory(
    categoryId: string,
    limit: number,
  ): Promise<Question[]> {
    return this.ormRepository
      .createQueryBuilder('q')
      .innerJoin('q.categories', 'qc', 'qc.categoryId = :categoryId', {
        categoryId,
      })
      .leftJoinAndSelect('q.answers', 'a')
      .leftJoinAndSelect('q.followupAnswers', 'f')
      .where('q.usage = :usage', { usage: QuestionUsage.ONBOARDING })
      .andWhere('q.isActive = true')
      .orderBy('q.id', 'ASC')
      .addOrderBy('a.id', 'ASC')
      .take(limit)
      .getMany();
  }

  async findByIdWithAnswers(questionId: string): Promise<Question | null> {
    return this.ormRepository.findOne({
      where: { id: questionId },
      relations: {
        answers: true,
        followupAnswers: true,
        categories: true,
      },
    });
  }

  async findRandomDailyExcluding(excludeIds: string[]):Promise<Question | null>{
    const qb = this.ormRepository.createQueryBuilder('q')
    .where('q.usage = :usage', {usage: QuestionUsage.DAILY})
    .andWhere('q.isActive = true');

    if (excludeIds.length > 0) {
    qb.andWhere('q.id NOT IN (:...excludeIds)', { excludeIds });
  }
  
  return qb.orderBy('RAND()').limit(1).getOne();
  }
}
