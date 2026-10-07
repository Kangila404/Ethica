import { ArchiveService } from './archive.service';
import { UserStatus } from 'src/user/domain/enum/user-status.enum';

describe('Archive question images', () => {
  type Deps = ConstructorParameters<typeof ArchiveService>;

  it.each([
    null,
    'questions/dilemma.webp',
    'https://images.example.com/dilemma.webp',
  ])(
    'returns the current question image in both list and detail: %s',
    async (imageKey) => {
      const record = {
        id: 'record',
        answerId: 'answer',
        userId: 'user',
        serviceDate: '2026-10-01',
        isOnboarding: true,
      };
      const answer = {
        id: 'answer',
        questionId: 'question',
        body: '선택',
        explanation: '해설',
      };
      const question = { id: 'question', stage1Body: '질문', imageKey };
      const service = new ArchiveService(
        {
          findByUserId: jest
            .fn()
            .mockResolvedValue({ id: 'user', userStatus: UserStatus.ACTIVE }),
        } as unknown as Deps[0],
        {
          findAllByUserId: jest.fn().mockResolvedValue([record]),
          findByIdAndUserId: jest.fn().mockResolvedValue(record),
        } as unknown as Deps[1],
        {
          findByIds: jest.fn().mockResolvedValue([answer]),
          findById: jest.fn().mockResolvedValue(answer),
        },
        {
          findByIds: jest.fn().mockResolvedValue([question]),
          findById: jest.fn().mockResolvedValue(question),
        } as unknown as Deps[3],
        {} as Deps[4],
        {
          findAllByUserId: jest.fn().mockResolvedValue([]),
        } as unknown as Deps[5],
      );
      const list = await service.getUserAnswers('user');
      const detail = await service.getUserAnswer('user', 'record');
      expect(
        (JSON.parse(JSON.stringify(list)) as { items: unknown[] }).items[0],
      ).toMatchObject({
        userAnswerId: 'record',
        imageKey,
      });
      expect(JSON.parse(JSON.stringify(detail))).toMatchObject({
        userAnswerId: 'record',
        imageKey,
      });
    },
  );
});
