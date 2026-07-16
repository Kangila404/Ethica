import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Philosopher } from "./domain/model/philosopher.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Philosopher])],
})
export class PhilosopherModule {}