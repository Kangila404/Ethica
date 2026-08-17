import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AuthModule } from './auth/auth.module';
import {
  addTransactionalDataSource,
  getDataSourceByName,
} from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { CategoryModule } from './category/category.module';
import { PhilosopherModule } from './philosopher/philosopher.module';
import { ScheduleModule } from '@nestjs/schedule';
import { DailyModule } from './daily/daily.module';
import { AnalysisModule } from './analysis/analysis.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: true,
      }),

      // transactional 옵션
      dataSourceFactory: (options) => {
        if (!options) throw new Error('Invalid options');
        return Promise.resolve(
          getDataSourceByName('default') ??
            addTransactionalDataSource(new DataSource(options)),
        );
      },
    }),

    // ================= 모듈 모음
    // 1. UserModule
    UserModule,
    // 2. OnboardingModule
    OnboardingModule,
    // 3. AuthModule
    AuthModule,
    // 4. CategoryModule
    CategoryModule,
    // 5. PhilosopherModule
    PhilosopherModule,
    // 6. DailyModule
    DailyModule,
    // 7. AnalysisModule
    AnalysisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
