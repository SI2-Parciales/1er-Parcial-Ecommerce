import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ACTIVE_STATUS,
  INACTIVE_STATUS,
  isPrismaError,
  normalizeName,
} from '../catalogos/catalogos.utils.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateTallaDto,
  ListTallasQueryDto,
  UpdateTallaDto,
} from './tallas.dto.js';

@Injectable()
export class TallasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTallaDto) {
    const nombre = normalizeName(input.nombre);
    await this.ensureNameAvailable(nombre);
    try {
      return await this.prisma.talla.create({
        data: { nombre, estado: ACTIVE_STATUS },
        select: this.tallaSelect,
      });
    } catch (error: unknown) {
      this.throwUniqueConflict(error);
    }
  }

  async findAll(query: ListTallasQueryDto) {
    const where: Prisma.TallaWhereInput = query.includeInactive
      ? {}
      : { estado: ACTIVE_STATUS };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      this.prisma.talla.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { id: 'desc' },
        select: this.tallaSelect,
      }),
      this.prisma.talla.count({ where }),
    ]);
    return { data, meta: { page: query.page, limit: query.limit, total } };
  }

  async findById(id: number) {
    const talla = await this.prisma.talla.findUnique({
      where: { id },
      select: this.tallaSelect,
    });
    if (!talla)
      throw new NotFoundException('No se encontró la talla solicitada.');
    return talla;
  }

  async update(id: number, input: UpdateTallaDto) {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('Envía al menos un campo para actualizar.');
    }
    await this.findById(id);

    const data: Prisma.TallaUpdateInput = {};
    if (input.nombre !== undefined) {
      const nombre = normalizeName(input.nombre);
      await this.ensureNameAvailable(nombre, id);
      data.nombre = nombre;
    }
    if (input.estado !== undefined) data.estado = input.estado;
    try {
      return await this.prisma.talla.update({
        where: { id },
        data,
        select: this.tallaSelect,
      });
    } catch (error: unknown) {
      this.throwUniqueConflict(error);
    }
  }

  async deactivate(id: number) {
    const talla = await this.update(id, { estado: INACTIVE_STATUS });
    return { message: 'Talla desactivada.', talla };
  }

  private async ensureNameAvailable(nombre: string, excludeId?: number) {
    const existing = await this.prisma.talla.findFirst({
      where: {
        nombre: { equals: nombre, mode: 'insensitive' },
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException('El nombre de talla ya está registrado.');
  }

  private throwUniqueConflict(error: unknown): never {
    if (isPrismaError(error, 'P2002')) {
      throw new ConflictException('El nombre de talla ya está registrado.');
    }
    throw error;
  }

  private readonly tallaSelect = {
    id: true,
    nombre: true,
    estado: true,
  } satisfies Prisma.TallaSelect;
}
