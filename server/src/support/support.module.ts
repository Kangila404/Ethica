import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/user/user.module';
import { Inquiry } from './domain/model/inquiry.entity';
import { Notice } from './domain/model/notice.entity';
import { Term } from './domain/model/term.entity';
import {
  SupportController,
  AdminSupportController,
} from './presentation/support.controller';
import { SupportService } from './application/support.service';
import { SUPPORT_STORE } from './domain/support-store';
import { SqlSupportStore } from './infrastructure/support.store';
@Module({
  imports: [UserModule, TypeOrmModule.forFeature([Inquiry, Notice, Term])],
  controllers: [SupportController, AdminSupportController],
  providers: [
    SupportService,
    { provide: SUPPORT_STORE, useClass: SqlSupportStore },
  ],
})
export class SupportModule {}
