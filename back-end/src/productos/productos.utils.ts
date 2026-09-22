import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';

export function isAdministrator(user?: AuthenticatedUser): boolean {
  return user?.role === ACTOR_ROLE.ADMINISTRADOR;
}

export function requireAdministratorForInactive(
  estado: string | undefined,
  user?: AuthenticatedUser,
): void {
  if (estado === 'INACTIVO' && !isAdministrator(user)) {
    throw new ForbiddenException(
      'Solo un administrador puede consultar registros inactivos.',
    );
  }
}

export function normalizeSku(value: string): string {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

export function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}
