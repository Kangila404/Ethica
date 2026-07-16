import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/model/user.entity';
import { UserController } from './presentation/controller/user.controller';
import { UserService } from './application/user.service';
import { USER_REPOSITORY } from './domain/repository/user.repository';
import { UserRepositoryImpl } from './infrastructure/persistence/user.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [
    UserService,
    { provide: USER_REPOSITORY, useClass: UserRepositoryImpl },
  ],
  exports: [USER_REPOSITORY],
})
export class UserModule {}
