import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/infrastructure/security/jwt-auth.guard';
import { CurrentUserId } from 'src/auth/infrastructure/security/current-user.decorator';
import { AdminGuard } from 'src/admin/presentation/admin.guard';
import { AccountService } from '../application/account.service';
import { WithdrawalRequest } from './withdrawal.dto';
import { IdPipe } from 'src/common/id.pipe';
import { PageQuery } from 'src/common/page.dto';
@ApiTags('Account lifecycle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
@Controller('/api')
export class AccountController {
  constructor(private readonly service: AccountService) {}
  @Delete('users/me') withdraw(
    @CurrentUserId() userId: string,
    @Body() input: WithdrawalRequest,
  ) {
    return this.service.withdraw(userId, input);
  }
  @UseGuards(AdminGuard) @Get('admin/revocations') jobs(
    @Query() page: PageQuery,
  ) {
    return this.service.jobs(page.after);
  }
  @UseGuards(AdminGuard) @Post('admin/revocations/:id/retry') retry(
    @Param('id', IdPipe) id: string,
  ) {
    return this.service.retry(id);
  }
}
