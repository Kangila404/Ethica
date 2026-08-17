import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/domain/model/user.entity';
import { OnboardingController } from './presentation/controller/onboarding.controller';
import { OnboardingService } from './application/onboarding.service';
import { USER_REPOSITORY } from 'src/user/domain/repository/user.repository';
import { UserRepositoryImpl } from 'src/user/infrastructure/persistence/user.repository.impl';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/user/user.module';
import { UserAnswerModule } from 'src/user-answer/user-answer.module';
import { QuestionModule } from 'src/question/question.module';
import { PhilosopherModule } from 'src/philosopher/philosopher.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AuthModule,
    UserModule,
    UserAnswerModule,
    QuestionModule,
    PhilosopherModule,
  ],
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    { provide: USER_REPOSITORY, useClass: UserRepositoryImpl },
  ],
})
export class OnboardingModule {}
