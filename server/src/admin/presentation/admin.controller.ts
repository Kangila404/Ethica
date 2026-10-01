import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/infrastructure/security/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from '../application/admin.service';
import {
  CategoryInput,
  PhilosopherInput,
  PostInput,
  SegmentInput,
  QuestionInput,
} from './content.dto';
import { PageQuery } from 'src/common/page.dto';
import { IdPipe } from 'src/common/id.pipe';
@ApiTags('Admin content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
@Controller('/api/admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}
  @Get('categories') listCategoryInput(@Query() page: PageQuery) {
    return this.service.list('categories', page.after);
  }
  @Get('categories/:id') getCategoryInput(@Param('id', IdPipe) id: string) {
    return this.service.get('categories', id);
  }
  @Post('categories') createCategoryInput(@Body() input: CategoryInput) {
    return this.service.save('categories', input);
  }
  @Put('categories/:id') updateCategoryInput(
    @Param('id', IdPipe) id: string,
    @Body() input: CategoryInput,
  ) {
    return this.service.save('categories', input, id);
  }
  @Delete('categories/:id') deleteCategoryInput(
    @Param('id', IdPipe) id: string,
  ) {
    return this.service.remove('categories', id);
  }
  @Get('philosophers') listPhilosopherInput(@Query() page: PageQuery) {
    return this.service.list('philosophers', page.after);
  }
  @Get('philosophers/:id') getPhilosopherInput(
    @Param('id', IdPipe) id: string,
  ) {
    return this.service.get('philosophers', id);
  }
  @Post('philosophers') createPhilosopherInput(
    @Body() input: PhilosopherInput,
  ) {
    return this.service.save('philosophers', input);
  }
  @Put('philosophers/:id') updatePhilosopherInput(
    @Param('id', IdPipe) id: string,
    @Body() input: PhilosopherInput,
  ) {
    return this.service.save('philosophers', input, id);
  }
  @Delete('philosophers/:id') deletePhilosopherInput(
    @Param('id', IdPipe) id: string,
  ) {
    return this.service.remove('philosophers', id);
  }
  @Get('posts') listPostInput(@Query() page: PageQuery) {
    return this.service.list('posts', page.after);
  }
  @Get('posts/:id') getPostInput(@Param('id', IdPipe) id: string) {
    return this.service.get('posts', id);
  }
  @Post('posts') createPostInput(@Body() input: PostInput) {
    return this.service.save('posts', input);
  }
  @Put('posts/:id') updatePostInput(
    @Param('id', IdPipe) id: string,
    @Body() input: PostInput,
  ) {
    return this.service.save('posts', input, id);
  }
  @Delete('posts/:id') deletePostInput(@Param('id', IdPipe) id: string) {
    return this.service.remove('posts', id);
  }
  @Get('segments') listSegmentInput(@Query() page: PageQuery) {
    return this.service.list('segments', page.after);
  }
  @Get('segments/:id') getSegmentInput(@Param('id', IdPipe) id: string) {
    return this.service.get('segments', id);
  }
  @Post('segments') createSegmentInput(@Body() input: SegmentInput) {
    return this.service.save('segments', input);
  }
  @Put('segments/:id') updateSegmentInput(
    @Param('id', IdPipe) id: string,
    @Body() input: SegmentInput,
  ) {
    return this.service.save('segments', input, id);
  }
  @Delete('segments/:id') deleteSegmentInput(@Param('id', IdPipe) id: string) {
    return this.service.remove('segments', id);
  }
  @Get('questions') questions(@Query() page: PageQuery) {
    return this.service.questions(page.after);
  }
  @Get('questions/:id') question(@Param('id', IdPipe) id: string) {
    return this.service.question(id);
  }
  @Post('questions') createQuestion(@Body() input: QuestionInput) {
    return this.service.saveQuestion(input);
  }
  @Put('questions/:id') updateQuestion(
    @Param('id', IdPipe) id: string,
    @Body() input: QuestionInput,
  ) {
    return this.service.saveQuestion(input, id);
  }
  @Delete('questions/:id') deactivate(@Param('id', IdPipe) id: string) {
    return this.service.deactivateQuestion(id);
  }
  @Get('users') users(@Query() page: PageQuery) {
    return this.service.users(page.after);
  }
  @Get('users/:id') user(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.user(id);
  }
}
