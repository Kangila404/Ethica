import { Philosopher } from 'src/philosopher/domain/model/philosopher.entity';

type ComposedPhilosopherInput = {
  philosopher: Philosopher;
  percent: number;
};

export default class AnaisysResponse {
  nearestPhilosopher!: string;
  composition!: ComposedPhilosopher[];
  accuracy!: number;

  static of(
    nearestPhilosopher: string,
    composition: ComposedPhilosopherInput[],
    accuracy: number,
  ): AnaisysResponse {
    const dto = new AnaisysResponse();
    dto.nearestPhilosopher = nearestPhilosopher;
    dto.composition = composition.map((item) =>
      ComposedPhilosopher.of(item.philosopher, item.percent),
    );
    dto.accuracy = accuracy;
    return dto;
  }
}

class ComposedPhilosopher {
  philosopherId!: string;
  name!: string;
  percent!: number;

  static of(philosopher: Philosopher, percent: number): ComposedPhilosopher {
    const dto = new ComposedPhilosopher();
    dto.philosopherId = philosopher.id;
    dto.name = philosopher.name;
    dto.percent = percent;
    return dto;
  }
}
