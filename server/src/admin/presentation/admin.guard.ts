import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from 'src/user/domain/enum/user-role.enum';
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role: UserRole } }>();
    if (request.user?.role !== UserRole.ADMIN)
      throw new ForbiddenException({
        code: 'ADMIN_REQUIRED',
        message: '관리자 권한이 필요합니다.',
      });
    return true;
  }
}
