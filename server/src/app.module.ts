import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AuthModule } from './auth/auth.module';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource } from 'typeorm';

@Module({
  imports: [
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
      dataSourceFactory: async (options) => {
        if(!options) throw new Error('Invalid options');
        return addTransactionalDataSource(new DataSource(options));
      }
    }),

    // ================= 모듈 모음
    // 1. UserModule
    UserModule,
    // 2. OnboardingModule
    OnboardingModule,
    // 3. AuthModule
    AuthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
