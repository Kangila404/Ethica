import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// current-user.decorator.ts
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: { userId: string } }>();
    return request.user.userId;
  },
);

export const OptionalUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined =>
    ctx.switchToHttp().getRequest<{ user?: { userId: string } }>().user?.userId,
);
