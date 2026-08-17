import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Philosopher } from './domain/model/philosopher.entity';
import { UserPhilosopherCount } from './domain/model/user-philosopher-count.entity';
import { USER_PHILOSOPHER_COUNT_REPOSITORY } from './domain/repository/user-philosopher-count.repository';
import { UserPhilosopherCountRepositoryImpl } from './infrastructure/persistence/repository/user-philosopher-count.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([Philosopher, UserPhilosopherCount])],
  providers: [
    {
      provide: USER_PHILOSOPHER_COUNT_REPOSITORY,
      useClass: UserPhilosopherCountRepositoryImpl,
    },
  ],
  exports: [USER_PHILOSOPHER_COUNT_REPOSITORY],
})
export class PhilosopherModule {}
