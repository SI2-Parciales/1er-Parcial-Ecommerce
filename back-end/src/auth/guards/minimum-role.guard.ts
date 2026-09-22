import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './jwt-auth.guard.js';
import { ActorRole, MINIMUM_ROLE_KEY, ROLE_LEVEL } from '../auth.constants.js';

@Injectable()
export class MinimumRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const minimumRole = this.reflector.getAllAndOverride<ActorRole>(MINIMUM_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!minimumRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const actorLevel = ROLE_LEVEL[request.user?.role as ActorRole];
    const minimumLevel = ROLE_LEVEL[minimumRole];

    if (!actorLevel || !minimumLevel || actorLevel < minimumLevel) {
      throw new ForbiddenException('Tu rol no tiene permiso para acceder a este endpoint.');
    }

    return true;
  }
}
