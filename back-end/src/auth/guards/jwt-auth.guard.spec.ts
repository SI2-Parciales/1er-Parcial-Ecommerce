import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  OPTIONAL_AUTH_ROUTE_KEY,
  PUBLIC_ROUTE_KEY,
} from '../auth.constants.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

function createContext(authorization?: string) {
  const request: { headers: { authorization?: string }; user?: unknown } = {
    headers: { authorization },
  };
  const context = {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  it('deja pasar una ruta marcada como pública sin consultar JWT ni BD', async () => {
    const verifySpy = vi.fn();
    const findUniqueSpy = vi.fn();
    const reflector = {
      getAllAndOverride: vi.fn(() => true),
    } as unknown as Reflector;
    const jwtService = { verifyAsync: verifySpy } as unknown as JwtService;
    const prisma = {
      usuario: { findUnique: findUniqueSpy },
    } as unknown as PrismaService;
    const guard = new JwtAuthGuard(reflector, jwtService, prisma);
    const { context } = createContext();

    expect(await guard.canActivate(context)).toBe(true);
    expect(verifySpy).not.toHaveBeenCalled();
    expect(findUniqueSpy).not.toHaveBeenCalled();
  });

  it('requiere un Bearer token en rutas protegidas', async () => {
    const reflector = {
      getAllAndOverride: vi.fn(() => false),
    } as unknown as Reflector;
    const jwtService = { verifyAsync: vi.fn() } as unknown as JwtService;
    const prisma = {
      usuario: { findUnique: vi.fn() },
    } as unknown as PrismaService;
    const guard = new JwtAuthGuard(reflector, jwtService, prisma);
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('permite omitir token en autenticación opcional y valida uno cuando se envía', async () => {
    const findUniqueSpy = vi.fn().mockResolvedValue({
      id: 23,
      email: 'admin@example.test',
      nombre: 'Admin',
      estado: 'ACTIVO',
      rol: { nombre: 'ADMINISTRADOR' },
    });
    const reflector = {
      getAllAndOverride: vi.fn(
        (key: string) => key === OPTIONAL_AUTH_ROUTE_KEY,
      ),
    } as unknown as Reflector;
    const verifySpy = vi.fn().mockResolvedValue({ sub: 23 });
    const jwtService = { verifyAsync: verifySpy } as unknown as JwtService;
    const prisma = {
      usuario: { findUnique: findUniqueSpy },
    } as unknown as PrismaService;
    const guard = new JwtAuthGuard(reflector, jwtService, prisma);

    expect(await guard.canActivate(createContext().context)).toBe(true);
    expect(verifySpy).not.toHaveBeenCalled();

    const authenticated = createContext('Bearer valid');
    expect(await guard.canActivate(authenticated.context)).toBe(true);
    expect(authenticated.request.user).toMatchObject({
      id: 23,
      role: 'ADMINISTRADOR',
    });

    verifySpy.mockRejectedValueOnce(new Error('invalid'));
    await expect(
      guard.canActivate(createContext('Bearer invalid').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('usa el rol y el estado actuales de la BD, no el claim role del token', async () => {
    const findUniqueSpy = vi.fn().mockResolvedValue({
      id: 23,
      email: 'cliente@example.test',
      nombre: 'Cliente',
      estado: 'ACTIVO',
      rol: { nombre: 'CLIENTE' },
    });
    const reflector = {
      getAllAndOverride: vi.fn(() => false),
    } as unknown as Reflector;
    const jwtService = {
      verifyAsync: vi
        .fn()
        .mockResolvedValue({ sub: 23, role: 'ADMINISTRADOR' }),
    } as unknown as JwtService;
    const prisma = {
      usuario: { findUnique: findUniqueSpy },
    } as unknown as PrismaService;
    const guard = new JwtAuthGuard(reflector, jwtService, prisma);
    const { context, request } = createContext('Bearer signed-token');

    expect(await guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({
      id: 23,
      email: 'cliente@example.test',
      nombre: 'Cliente',
      role: 'CLIENTE',
    });
    expect(findUniqueSpy).toHaveBeenCalledWith({
      where: { id: 23 },
      select: {
        id: true,
        email: true,
        nombre: true,
        estado: true,
        rol: { select: { nombre: true } },
      },
    });
  });

  it('rechaza JWT inválido, usuario inexistente o cuenta inactiva', async () => {
    const metadataSpy = vi.fn(() => false);
    const verifySpy = vi.fn();
    const findUniqueSpy = vi.fn();
    const reflector = {
      getAllAndOverride: metadataSpy,
    } as unknown as Reflector;
    const jwtService = { verifyAsync: verifySpy } as unknown as JwtService;
    const prisma = {
      usuario: { findUnique: findUniqueSpy },
    } as unknown as PrismaService;
    const guard = new JwtAuthGuard(reflector, jwtService, prisma);

    verifySpy.mockRejectedValue(new Error('invalid token'));
    await expect(
      guard.canActivate(createContext('Bearer wrong').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    verifySpy.mockResolvedValue({ sub: 23 });
    findUniqueSpy.mockResolvedValue(null);
    await expect(
      guard.canActivate(createContext('Bearer valid').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    findUniqueSpy.mockResolvedValue({ estado: 'INACTIVO' });
    await expect(
      guard.canActivate(createContext('Bearer valid').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(metadataSpy).toHaveBeenCalledWith(
      PUBLIC_ROUTE_KEY,
      expect.any(Array),
    );
  });
});
