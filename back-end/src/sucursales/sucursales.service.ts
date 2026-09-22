import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AssignPersonalDto,
  CreateSucursalDto,
  ListSucursalesQueryDto,
  UpdateSucursalDto,
} from './sucursales.dto.js';

const ACTIVE_STATUS = 'ACTIVO';
const INACTIVE_STATUS = 'INACTIVO';
const STAFF_ROLES = [
  ACTOR_ROLE.CAJERO,
  ACTOR_ROLE.ENCARGADO_SUCURSAL,
  ACTOR_ROLE.ADMINISTRADOR,
] as const;

@Injectable()
export class SucursalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSucursalDto) {
    return this.prisma.sucursal.create({
      data: {
        nombre: input.nombre,
        ubicacion: input.ubicacion,
        cantidadVestidores: input.cantidadVestidores,
        estado: input.estado,
      },
      select: this.sucursalSelect,
    });
  }

  async findAll(query: ListSucursalesQueryDto) {
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      this.prisma.sucursal.findMany({
        skip,
        take: query.limit,
        orderBy: { id: 'desc' },
        select: this.sucursalSelect,
      }),
      this.prisma.sucursal.count(),
    ]);

    return { data, meta: { page: query.page, limit: query.limit, total } };
  }

  async findById(id: number) {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id },
      select: this.sucursalSelect,
    });
    if (!sucursal) {
      throw new NotFoundException('No se encontró la sucursal solicitada.');
    }
    return sucursal;
  }

  async update(id: number, input: UpdateSucursalDto) {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('Envía al menos un campo para actualizar.');
    }

    const data: Prisma.SucursalUpdateInput = {};
    if (input.nombre !== undefined) data.nombre = input.nombre;
    if (input.ubicacion !== undefined) data.ubicacion = input.ubicacion;
    if (input.cantidadVestidores !== undefined) {
      data.cantidadVestidores = input.cantidadVestidores;
    }
    if (input.estado !== undefined) data.estado = input.estado;

    try {
      return await this.prisma.sucursal.update({
        where: { id },
        data,
        select: this.sucursalSelect,
      });
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2025')) {
        throw new NotFoundException('No se encontró la sucursal solicitada.');
      }
      throw error;
    }
  }

  async deactivate(id: number) {
    const sucursal = await this.update(id, { estado: INACTIVE_STATUS });
    return { message: 'Sucursal desactivada.', sucursal };
  }

  async findPersonal(sucursalId: number) {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id: sucursalId },
      select: { id: true },
    });
    if (!sucursal) {
      throw new NotFoundException('No se encontró la sucursal solicitada.');
    }

    const users = await this.prisma.usuario.findMany({
      where: { sucursalId },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        rol: { select: { nombre: true } },
      },
    });

    return users.map(({ rol, ...user }) => ({ ...user, rol: rol.nombre }));
  }

  async assignPersonal(sucursalId: number, input: AssignPersonalDto) {
    return this.prisma.$transaction(async (transaction) => {
      // El bloqueo evita que una desactivación de la sucursal se cruce con el alta.
      const branchRows = await transaction.$queryRaw<Array<{ id: number }>>`
        SELECT "id" FROM "sucursales" WHERE "id" = ${sucursalId} FOR SHARE
      `;
      if (branchRows.length === 0) {
        throw new NotFoundException('No se encontró la sucursal solicitada.');
      }

      const branch = await transaction.sucursal.findUnique({
        where: { id: sucursalId },
        select: { estado: true },
      });
      if (branch?.estado !== ACTIVE_STATUS) {
        throw new ConflictException(
          'No se puede asignar personal a una sucursal inactiva.',
        );
      }

      // Serializa asignaciones concurrentes del mismo usuario para detectar duplicados.
      await transaction.$queryRaw<Array<{ id: number }>>`
        SELECT "id" FROM "usuarios" WHERE "id" = ${input.usuarioId} FOR UPDATE
      `;
      const user = await transaction.usuario.findUnique({
        where: { id: input.usuarioId },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
          estado: true,
          sucursalId: true,
          rol: { select: { nombre: true } },
        },
      });
      if (!user) {
        throw new NotFoundException('No se encontró el usuario solicitado.');
      }
      if (user.estado !== ACTIVE_STATUS) {
        throw new BadRequestException(
          'Solo se puede asignar personal con cuenta activa.',
        );
      }
      if (
        !STAFF_ROLES.includes(user.rol.nombre as (typeof STAFF_ROLES)[number])
      ) {
        throw new BadRequestException(
          'El usuario debe tener un rol de personal para asignarlo.',
        );
      }
      if (user.sucursalId === sucursalId) {
        throw new ConflictException('El usuario ya pertenece a esta sucursal.');
      }

      const assigned = await transaction.usuario.update({
        where: { id: input.usuarioId },
        data: { sucursalId },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
          rol: { select: { nombre: true } },
        },
      });
      return { ...assigned, rol: assigned.rol.nombre };
    });
  }

  async unassignPersonal(sucursalId: number, usuarioId: number) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw<Array<{ id: number }>>`
        SELECT "id" FROM "usuarios" WHERE "id" = ${usuarioId} FOR UPDATE
      `;

      const branch = await transaction.sucursal.findUnique({
        where: { id: sucursalId },
        select: { id: true },
      });
      if (!branch) {
        throw new NotFoundException('No se encontró la sucursal solicitada.');
      }

      const user = await transaction.usuario.findUnique({
        where: { id: usuarioId },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
          sucursalId: true,
          rol: { select: { nombre: true } },
        },
      });
      if (!user || user.sucursalId !== sucursalId) {
        throw new NotFoundException(
          'El usuario no está asignado a esta sucursal.',
        );
      }

      await transaction.usuario.update({
        where: { id: usuarioId },
        data: { sucursalId: null },
      });
      const { sucursalId: _sucursalId, ...publicUser } = user;
      return { ...publicUser, rol: user.rol.nombre };
    });
  }

  private readonly sucursalSelect = {
    id: true,
    nombre: true,
    ubicacion: true,
    cantidadVestidores: true,
    estado: true,
    creadoEn: true,
    actualizadoEn: true,
  } satisfies Prisma.SucursalSelect;

  private isPrismaError(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
