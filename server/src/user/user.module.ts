import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/model/user.entity';
import { UserSummary } from './domain/model/user-summary.entity';
import { UserController } from './presentation/controller/user.controller';
import { UserService } from './application/user.service';
import { USER_REPOSITORY } from './domain/repository/user.repository';
import { UserRepositoryImpl } from './infrastructure/persistence/user.repository.impl';
import { USER_SUMMARY_REPOSITORY } from './domain/repository/user-summary.repository';
import { UserSummaryRepositoryImpl } from './infrastructure/persistence/user-summary.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserSummary])],
  controllers: [UserController],
  providers: [
    UserService,
    { provide: USER_REPOSITORY, useClass: UserRepositoryImpl },
    { provide: USER_SUMMARY_REPOSITORY, useClass: UserSummaryRepositoryImpl },
  ],
  exports: [USER_REPOSITORY, USER_SUMMARY_REPOSITORY],
})
export class UserModule {}
