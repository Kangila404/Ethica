import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
} from '../domain/repository/category.repository';
import { CategoryListResponse } from '../presentation/category-response.dto';
@Injectable()
export class CategoryService {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
  ) {}
  async list(): Promise<CategoryListResponse> {
    return {
      items: (await this.categories.findAll()).map((c) => ({
        categoryId: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
      })),
    };
  }
}
