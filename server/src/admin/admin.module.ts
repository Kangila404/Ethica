import { Module } from '@nestjs/common';
import { AdminController } from './presentation/admin.controller';
import { AdminService } from './application/admin.service';
import { CONTENT_STORE } from './domain/content-store';
import { SqlContentStore } from './infrastructure/content.store';
@Module({
  controllers: [AdminController],
  providers: [
    AdminService,
    { provide: CONTENT_STORE, useClass: SqlContentStore },
  ],
})
export class AdminModule {}
