import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { DailyService } from 'src/daily/application/daily.service';
import { Philosopher } from 'src/philosopher/domain/model/philosopher.entity';
import {
  USER_REPOSITORY,
  type UserRepository,
} from 'src/user/domain/repository/user.repository';
import {
  USER_PHILOSOPHER_COUNT_REPOSITORY,
  type UserPhilosopherCountRepository,
} from 'src/philosopher/domain/repository/user-philosopher-count.repository';
import { composeThoughts } from '../domain/composition';
import {
  TodayAnalysisResponse,
  CompositionState,
  AnalysisPhilosopher,
} from '../presentation/dto/res/today-analysis-response.dto';

@Injectable()
export class TodayAnalysisService {
  constructor(
    private readonly daily: DailyService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(USER_PHILOSOPHER_COUNT_REPOSITORY)
    private readonly counts: UserPhilosopherCountRepository,
    @InjectRepository(Philosopher)
    private readonly philosophers: Repository<Philosopher>,
  ) {}

  @Transactional()
  async getToday(userId: string): Promise<TodayAnalysisResponse> {
    // Reuse scheduling and its user lock, retained by this outer transaction.
    // This keeps the selected answer and aggregate consistent with concurrent submissions.
    const daily = await this.daily.getDaily(userId);
    const response: TodayAnalysisResponse = {
      status: daily.userDailyQuestion,
      serviceDate: 'serviceDate' in daily ? (daily.serviceDate ?? null) : null,
      nextDailyAt: daily.nextDailyAt ?? null,
      selectedPhilosopher: null,
      before: null,
      after: null,
      changes: [],
      nearestChanged: false,
    };
    if (daily.userDailyQuestion !== 'completed') return response;
    const selectedId =
      'selectedAnswer' in daily ? daily.selectedAnswer?.philosopherId : null;
    const user = await this.users.findByUserId(userId);
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');
    const counts = (await this.counts.findByUserId(user.id)).filter(
      (c) => c.count > 0,
    );
    if (!selectedId || !counts.some((c) => c.philosopherId === selectedId))
      throw new ConflictException('오늘 분석 집계를 확인 중입니다.');
    const philosophers = await this.philosophers.findBy({
      id: In(counts.map((c) => c.philosopherId)),
    });
    if (philosophers.length !== counts.length)
      throw new ConflictException('분석에 필요한 사상가 정보를 확인 중입니다.');
    const reference = (id: string): AnalysisPhilosopher => {
      const p = philosophers.find((p) => p.id === id)!;
      return { id: p.id, name: p.name, school: p.school, imageKey: p.imageKey };
    };
    const state = (
      values: { philosopherId: string; count: number }[],
    ): CompositionState => {
      const composition = composeThoughts(values, philosophers);
      return {
        answerCount: values.reduce((sum, c) => sum + c.count, 0),
        composition,
        nearestPhilosopher: composition[0]
          ? reference(composition[0].philosopherId)
          : null,
      };
    };
    // Recalculate from integer counts, not rounded percentages. Content edits use
    // current philosopher mappings, consistent with the existing archive policy.
    response.before = state(
      counts.map((c) => ({
        philosopherId: c.philosopherId,
        count: c.count - (c.philosopherId === selectedId ? 1 : 0),
      })),
    );
    response.after = state(counts);
    response.selectedPhilosopher = reference(selectedId);
    response.nearestChanged =
      response.before.nearestPhilosopher !== null &&
      response.before.nearestPhilosopher.id !==
        response.after.nearestPhilosopher?.id;
    response.changes = response.after.composition.map((c) => {
      const beforePercent =
        response.before!.composition.find(
          (p) => p.philosopherId === c.philosopherId,
        )?.percent ?? 0;
      return {
        philosopherId: c.philosopherId,
        name: c.name,
        beforePercent,
        afterPercent: c.percent,
        deltaPercentagePoints:
          Math.round((c.percent - beforePercent) * 10) / 10,
      };
    });
    return response;
  }
}
