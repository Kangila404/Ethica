import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../domain/model/category.entity';
import { CategoryRepository } from '../domain/repository/category.repository';
@Injectable()
export class CategoryRepositoryImpl implements CategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}
  findAll(): Promise<Category[]> {
    return this.categories.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }
  findById(id: string): Promise<Category | null> {
    return this.categories.findOneBy({ id });
  }
}
