import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './domain/model/category.entity';
import { CATEGORY_REPOSITORY } from './domain/repository/category.repository';
import { CategoryRepositoryImpl } from './infrastructure/category.repository.impl';
import { CategoryService } from './application/category.service';
import { CategoryController } from './presentation/category.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoryController],
  providers: [
    CategoryService,
    { provide: CATEGORY_REPOSITORY, useClass: CategoryRepositoryImpl },
  ],
  exports: [CATEGORY_REPOSITORY],
})
export class CategoryModule {}
