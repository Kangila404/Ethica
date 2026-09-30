import { Category } from '../model/category.entity';
export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');
export interface CategoryRepository {
  findAll(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
}
