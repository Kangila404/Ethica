import { Philosopher } from '../model/philosopher.entity';

export const PHILOSOPHER_REPOSITORY = Symbol('PHILOSOPHER_REPOSITORY');

export interface PhilosopherRepository {
  findById(id: string): Promise<Philosopher | null>;
  findAll(): Promise<Philosopher[]>;
}
