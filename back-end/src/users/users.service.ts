import {
  ConflictException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListUsersQueryDto, UpdateUserDto } from './users.dto.js';

const ACTIVE_STATUS = 'ACTIVO';
const INACTIVE_STATUS = 'INACTIVO';

export interface CreateUserInput {
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  passwordHash: string;
  estado: string;
  rolId: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListUsersQueryDto) {
    const skip = (query.page - 1) * query.limit;
    const [users, total] = await Promise.all([
      this.prisma.usuario.findMany({
        skip,
        take: query.limit,
        orderBy: { id: 'desc' },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          telefono: true,
          email: true,
          estado: true,
          sucursalId: true,
          rol: { select: { id: true, nombre: true, descripcion: true } },
        },
      }),
      this.prisma.usuario.count(),
    ]);

    return {
      data: users,
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  async findById(id: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        telefono: true,
        email: true,
        estado: true,
        sucursalId: true,
        rol: { select: { id: true, nombre: true, descripcion: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('No se encontró el usuario solicitado.');
    }

    return user;
  }

  async update(id: number, input: UpdateUserDto) {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('Envía al menos un campo para actualizar.');
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        // Serializa cambios administrativos para que el conteo del último admin
        // siga siendo correcto cuando llegan dos cambios concurrentes.
        const adminRoleRows = await transaction.$queryRaw<
          Array<{ id: number }>
        >`
          SELECT "id" FROM "roles" WHERE "nombre" = ${ACTOR_ROLE.ADMINISTRADOR} FOR UPDATE
        `;
        const adminRole = adminRoleRows[0];
        if (!adminRole) {
          throw new InternalServerErrorException(
            'El catálogo de roles no está inicializado.',
          );
        }

        const current = await transaction.usuario.findUnique({
          where: { id },
          select: { id: true, estado: true, rolId: true },
        });
        if (!current) {
          throw new NotFoundException('No se encontró el usuario solicitado.');
        }

        if (input.rolId !== undefined) {
          const role = await transaction.rol.findUnique({
            where: { id: input.rolId },
          });
          if (!role) {
            throw new NotFoundException('No se encontró el rol solicitado.');
          }
        }

        const nextRoleId = input.rolId ?? current.rolId;
        const nextStatus = input.estado ?? current.estado;
        const isRemovingActiveAdmin =
          current.rolId === adminRole.id &&
          current.estado === ACTIVE_STATUS &&
          (nextRoleId !== adminRole.id || nextStatus !== ACTIVE_STATUS);

        if (isRemovingActiveAdmin) {
          const otherActiveAdministrators = await transaction.usuario.count({
            where: {
              rolId: adminRole.id,
              estado: ACTIVE_STATUS,
              id: { not: current.id },
            },
          });
          if (otherActiveAdministrators === 0) {
            throw new ConflictException(
              'No se puede desactivar o cambiar el rol del último administrador activo.',
            );
          }
        }

        const data: Prisma.UsuarioUncheckedUpdateInput = {};
        if (input.nombre !== undefined) data.nombre = input.nombre;
        if (input.apellido !== undefined) data.apellido = input.apellido;
        if (input.telefono !== undefined) data.telefono = input.telefono;
        if (input.email !== undefined)
          data.email = input.email.trim().toLowerCase();
        if (input.rolId !== undefined) data.rolId = input.rolId;
        if (input.estado !== undefined) data.estado = input.estado;

        return transaction.usuario.update({
          where: { id },
          data,
          select: {
            id: true,
            nombre: true,
            apellido: true,
            telefono: true,
            email: true,
            estado: true,
            sucursalId: true,
            rol: { select: { id: true, nombre: true, descripcion: true } },
          },
        });
      });
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          'El correo electrónico ya está registrado.',
        );
      }
      throw error;
    }
  }

  async deactivate(id: number) {
    const user = await this.update(id, { estado: INACTIVE_STATUS });
    return { message: 'Usuario desactivado.', user };
  }

  findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
      include: { rol: true },
    });
  }

  create(data: CreateUserInput) {
    return this.prisma.usuario.create({
      data,
      include: { rol: true },
    });
  }

  private isPrismaError(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
