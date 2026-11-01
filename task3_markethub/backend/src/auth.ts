import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Routes without @Roles are public. Routes with @Roles need a valid token and a matching role.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.get<string[]>('roles', ctx.getHandler());
    if (!roles) return true;
    const req = ctx.switchToHttp().getRequest();
    try { req.user = this.jwt.verify((req.headers.authorization || '').replace('Bearer ', '')); }
    catch { throw new UnauthorizedException('Please sign in.'); }
    if (!roles.includes(req.user.role)) throw new ForbiddenException('You do not have permission to do that.');
    return true;
  }
}
