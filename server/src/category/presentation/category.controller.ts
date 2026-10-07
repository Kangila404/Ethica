import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/infrastructure/security/jwt-auth.guard';
import { CategoryService } from '../application/category.service';
import { CategoryListResponse } from './category-response.dto';
@ApiTags('Category API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('/api/categories')
export class CategoryController {
  constructor(private readonly service: CategoryService) {}
  @Get()
  @ApiOkResponse({ type: CategoryListResponse })
  list(): Promise<CategoryListResponse> {
    return this.service.list();
  }
}
