import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { ACTOR_ROLE, ActorRole } from '../auth.constants.js';
import { MinimumRoleGuard } from './minimum-role.guard.js';

const hierarchy: ActorRole[] = [
  ACTOR_ROLE.CLIENTE,
  ACTOR_ROLE.CAJERO,
  ACTOR_ROLE.ENCARGADO_SUCURSAL,
  ACTOR_ROLE.ADMINISTRADOR,
];

describe('MinimumRoleGuard', () => {
  it('aplica correctamente las 16 combinaciones de la jerarquía', () => {
    for (let actorIndex = 0; actorIndex < hierarchy.length; actorIndex += 1) {
      for (let requiredIndex = 0; requiredIndex < hierarchy.length; requiredIndex += 1) {
        const minimumRole = hierarchy[requiredIndex];
        const reflector = {
          getAllAndOverride: vi.fn(() => minimumRole),
        } as unknown as Reflector;
        const guard = new MinimumRoleGuard(reflector);
        const context = {
          getHandler: vi.fn(),
          getClass: vi.fn(),
          switchToHttp: () => ({
            getRequest: () => ({ user: { role: hierarchy[actorIndex] } }),
          }),
        } as unknown as ExecutionContext;
        const allowed = actorIndex >= requiredIndex;

        if (allowed) {
          expect(guard.canActivate(context)).toBe(true);
        } else {
          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        }
      }
    }
  });

  it('permite cualquier rol autenticado cuando la ruta no declara un mínimo', () => {
    const reflector = {
      getAllAndOverride: vi.fn(() => undefined),
    } as unknown as Reflector;
    const guard = new MinimumRoleGuard(reflector);
    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: ACTOR_ROLE.CLIENTE } }) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});
