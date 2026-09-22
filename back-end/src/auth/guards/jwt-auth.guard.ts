import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  OPTIONAL_AUTH_ROUTE_KEY,
  PUBLIC_ROUTE_KEY,
} from '../auth.constants.js';

export interface AuthenticatedUser {
  id: number;
  email: string;
  nombre: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

interface AccessTokenPayload {
  sub?: number | string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const isOptional = this.reflector.getAllAndOverride<boolean>(
      OPTIONAL_AUTH_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!token) {
      if (isOptional) return true;
      throw new UnauthorizedException('Se requiere un token Bearer válido.');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('El token es inválido o expiró.');
    }

    const userId =
      typeof payload.sub === 'string' ? Number(payload.sub) : payload.sub;
    if (!Number.isSafeInteger(userId) || (userId as number) < 1) {
      throw new UnauthorizedException('El token es inválido o expiró.');
    }

    const user = await this.prisma.usuario.findUnique({
      where: { id: userId as number },
      select: {
        id: true,
        email: true,
        nombre: true,
        estado: true,
        rol: { select: { nombre: true } },
      },
    });

    if (!user || user.estado !== 'ACTIVO') {
      throw new UnauthorizedException('La cuenta no está disponible.');
    }

    request.user = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.rol.nombre,
    };

    return true;
  }
}
