import { InjectRepository } from '@nestjs/typeorm';
import { UserDailyQuestion } from 'src/daily/domain/model/user_daily_question.entity';
import { UserDailyQuestionRepository } from 'src/daily/domain/repository/user-daily-question.repository';
import { Repository } from 'typeorm';

export class UserDailyQuestionRepositoryImpl implements UserDailyQuestionRepository {
  constructor(
    @InjectRepository(UserDailyQuestion)
    private readonly ormRepository: Repository<UserDailyQuestion>,
  ) {}

  async findByUserIdAndServiceDate(
    userId: string,
    serviceDate: string,
  ): Promise<UserDailyQuestion | null> {
    return await this.ormRepository.findOne({ where: { userId, serviceDate } });
  }

  async findServicedQuestionIds(userId: string): Promise<string[]> {
    const rows = await this.ormRepository.find({
      where: { userId },
      select: { questionId: true },
    });
    return rows.map((row) => row.questionId);
  }

  async save(userDailyQuestion: UserDailyQuestion): Promise<UserDailyQuestion> {
    return this.ormRepository.save(userDailyQuestion);
  }
}
