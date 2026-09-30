import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupportService } from '../application/support.service';
import {
  InquiryInput,
  NoticeInput,
  TermInput,
  InquiryAnswerInput,
} from './support.dto';
import { JwtAuthGuard } from 'src/auth/infrastructure/security/jwt-auth.guard';
import { AdminGuard } from 'src/admin/presentation/admin.guard';
import { CurrentUserId } from 'src/auth/infrastructure/security/current-user.decorator';
import { IdPipe } from 'src/common/id.pipe';
import { PageQuery } from 'src/common/page.dto';
@ApiTags('Support')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
@Controller('/api')
export class SupportController {
  constructor(private readonly service: SupportService) {}
  @Get('terms') term(@Query('type') type = 'service') {
    if (!['service', 'privacy'].includes(type))
      throw new BadRequestException('약관 종류가 올바르지 않습니다.');
    return this.service.term(type);
  }
  @Get('notices') notices(@Query() page: PageQuery) {
    return this.service.notices(false, page.after);
  }
  @Get('notices/:id') notice(@Param('id', IdPipe) id: string) {
    return this.service.notice(id, false);
  }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Get('inquiries') inquiries(
    @CurrentUserId() userId: string,
    @Query() page: PageQuery,
  ) {
    return this.service.inquiries(userId, page.after);
  }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Get('inquiries/:id') inquiry(
    @CurrentUserId() userId: string,
    @Param('id', IdPipe) id: string,
  ) {
    return this.service.inquiry(id, userId);
  }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post('inquiries') create(
    @CurrentUserId() userId: string,
    @Body() input: InquiryInput,
  ) {
    return this.service.create(userId, input.title, input.content);
  }
}
@ApiTags('Admin support')
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
export class AdminSupportController {
  constructor(private readonly service: SupportService) {}
  @Get('inquiries') inquiries(@Query() page: PageQuery) {
    return this.service.inquiries(undefined, page.after);
  }
  @Get('inquiries/:id') inquiry(@Param('id', IdPipe) id: string) {
    return this.service.inquiry(id);
  }
  @Patch('inquiries/:id/answer') answer(
    @Param('id', IdPipe) id: string,
    @CurrentUserId() userId: string,
    @Body() input: InquiryAnswerInput,
  ) {
    return this.service.answer(id, userId, input.answerContent);
  }
  @Get('notices') notices(@Query() page: PageQuery) {
    return this.service.notices(true, page.after);
  }
  @Post('notices') create(
    @CurrentUserId() userId: string,
    @Body() input: NoticeInput,
  ) {
    return this.service.saveNotice(userId, input);
  }
  @Put('notices/:id') update(
    @Param('id', IdPipe) id: string,
    @CurrentUserId() userId: string,
    @Body() input: NoticeInput,
  ) {
    return this.service.saveNotice(userId, input, id);
  }
  @Delete('notices/:id') remove(@Param('id', IdPipe) id: string) {
    return this.service.deleteNotice(id);
  }
  @Put('terms') term(@Body() input: TermInput) {
    return this.service.saveTerm(input);
  }
}
