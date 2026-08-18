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
    UserModule,
    PhilosopherModule,
    UserAnswerModule,
    QuestionModule,
    TypeOrmModule.forFeature([Philosopher]),
  ],
  controllers: [AnalisysController],
  providers: [
    AnalysisService,
    {
      provide: ANALYSIS_AI_CLIENT,
      useClass: OpenAiAnalysisAiClient,
    },
  ],
  exports: [],
})
export class AnalysisModule {}
