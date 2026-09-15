import { Philosopher } from 'src/philosopher/domain/model/philosopher.entity';

type PhilosopherInfoInput = {
  philosopher: Philosopher;
  postCount: number;
};

type NearestPhilosopherInfoInput = PhilosopherInfoInput & {
  closenessPercent: number;
};

export class PhilosophersResponse {
  nearest!: NearestPhilosopherInfo[];
  all!: PhilosopherInfo[];

  public static of(
    nearest: NearestPhilosopherInfoInput[],
    all: PhilosopherInfoInput[],
  ): PhilosophersResponse {
    const dto = new PhilosophersResponse();
    dto.nearest = nearest.map((item) =>
      NearestPhilosopherInfo.from(
        item.philosopher,
        item.postCount,
        item.closenessPercent,
      ),
    );
    dto.all = all.map((item) =>
      PhilosopherInfo.of(item.philosopher, item.postCount),
    );
    return dto;
  }
}

class PhilosopherInfo {
  id!: string;
  name!: string;
  school!: string;
  era!: string;
  postCount!: number;
  imageKey!: string | null;

  public static of(
    philosopher: Philosopher,
    postCount: number,
  ): PhilosopherInfo {
    const dto = new PhilosopherInfo();
    dto.id = philosopher.id;
    dto.name = philosopher.name;
    dto.school = philosopher.school;
    dto.era = philosopher.era;
    dto.postCount = postCount;
    dto.imageKey = philosopher.imageKey;
    return dto;
  }
}

class NearestPhilosopherInfo extends PhilosopherInfo {
  closenessPercent!: number;

  public static from(
    philosopher: Philosopher,
    postCount: number,
    closenessPercent: number,
  ): NearestPhilosopherInfo {
    const dto = new NearestPhilosopherInfo();
    Object.assign(dto, PhilosopherInfo.of(philosopher, postCount));
    dto.closenessPercent = closenessPercent;
    return dto;
  }
}
