import { Repository } from 'typeorm';
import { Question } from 'src/question/domain/model/question.entity';
import { QuestionRepositoryImpl } from './question.repository.impl';
describe('question publication eligibility', () => {
  it('only selects published questions for both onboarding and daily assignment', async () => {
    const builder = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([]), getOne: jest.fn().mockResolvedValue(null) };
    const repository = new QuestionRepositoryImpl({ createQueryBuilder: () => builder } as unknown as Repository<Question>);
    await repository.findOnboardingByCategory('1', 5);
    expect(builder.andWhere).toHaveBeenCalledWith("q.status = 'published'");
    builder.andWhere.mockClear();
    await repository.findRandomDailyExcluding([]);
    expect(builder.andWhere).toHaveBeenCalledWith("q.status = 'published'");
  });
});
