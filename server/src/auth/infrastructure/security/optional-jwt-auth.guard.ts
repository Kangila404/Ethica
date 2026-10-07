import { ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

/** Public reading is anonymous only when credentials are absent, never invalid. */
@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
    }>();
    if (request.headers.authorization === undefined) return true;
    return super.canActivate(context);
  }
}
