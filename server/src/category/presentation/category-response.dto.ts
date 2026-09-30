import { ApiProperty } from '@nestjs/swagger';
class CategoryItem {
  @ApiProperty() categoryId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sortOrder!: number;
}
export class CategoryListResponse {
  @ApiProperty({ type: [CategoryItem] }) items!: CategoryItem[];
}
