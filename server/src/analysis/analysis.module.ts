import { DailyModule } from 'src/daily/daily.module';
import { TodayAnalysisService } from './application/today-analysis.service';
import { ANALYSIS_SOURCE_REPOSITORY } from './domain/repository/analysis-source.repository';
import { AnalysisSourceRepositoryImpl } from './infrastructure/analysis-source.repository.impl';
import { Module } from '@nestjs/common';
import { AnalysisService } from './application/analysis.service';
import { UserModule } from 'src/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Philosopher } from 'src/philosopher/domain/model/philosopher.entity';
import { AnalisysController } from './presentation/controller/analysis.controller';
import { PhilosopherModule } from 'src/philosopher/philosopher.module';
import { OpenAiAnalysisAiClient } from './infrastructure/openai/openai-analysis-ai.client';
import { ANALYSIS_AI_CLIENT } from './domain/client/analysis-ai.client';
import { UserAnswerModule } from 'src/user-answer/user-answer.module';
import { QuestionModule } from 'src/question/question.module';

@Module({
  imports: [
    DailyModule,
    UserModule,
    PhilosopherModule,
    UserAnswerModule,
    QuestionModule,
    TypeOrmModule.forFeature([Philosopher]),
  ],
  controllers: [AnalisysController],
  providers: [
    AnalysisService,
    TodayAnalysisService,
    {
      provide: ANALYSIS_SOURCE_REPOSITORY,
      useClass: AnalysisSourceRepositoryImpl,
    },
    {
      provide: ANALYSIS_AI_CLIENT,
      useClass: OpenAiAnalysisAiClient,
    },
  ],
  exports: [AnalysisService],
})
export class AnalysisModule {}
