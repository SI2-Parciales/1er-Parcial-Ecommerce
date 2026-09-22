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
  normalizeHex,
  normalizeName,
} from '../catalogos/catalogos.utils.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateColorDto,
  ListColoresQueryDto,
  UpdateColorDto,
} from './colores.dto.js';

@Injectable()
export class ColoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateColorDto) {
    const nombre = normalizeName(input.nombre);
    await this.ensureNameAvailable(nombre);
    try {
      return await this.prisma.color.create({
        data: {
          nombre,
          codigoHex: normalizeHex(input.codigoHex),
          estado: ACTIVE_STATUS,
        },
        select: this.colorSelect,
      });
    } catch (error: unknown) {
      this.throwUniqueConflict(error);
    }
  }

  async findAll(query: ListColoresQueryDto) {
    const where: Prisma.ColorWhereInput = query.includeInactive
      ? {}
      : { estado: ACTIVE_STATUS };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      this.prisma.color.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { id: 'desc' },
        select: this.colorSelect,
      }),
      this.prisma.color.count({ where }),
    ]);
    return { data, meta: { page: query.page, limit: query.limit, total } };
  }

  async findById(id: number) {
    const color = await this.prisma.color.findUnique({
      where: { id },
      select: this.colorSelect,
    });
    if (!color)
      throw new NotFoundException('No se encontró el color solicitado.');
    return color;
  }

  async update(id: number, input: UpdateColorDto) {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('Envía al menos un campo para actualizar.');
    }
    await this.findById(id);

    const data: Prisma.ColorUpdateInput = {};
    if (input.nombre !== undefined) {
      const nombre = normalizeName(input.nombre);
      await this.ensureNameAvailable(nombre, id);
      data.nombre = nombre;
    }
    if (input.codigoHex !== undefined)
      data.codigoHex = normalizeHex(input.codigoHex);
    if (input.estado !== undefined) data.estado = input.estado;
    try {
      return await this.prisma.color.update({
        where: { id },
        data,
        select: this.colorSelect,
      });
    } catch (error: unknown) {
      this.throwUniqueConflict(error);
    }
  }

  async deactivate(id: number) {
    const color = await this.update(id, { estado: INACTIVE_STATUS });
    return { message: 'Color desactivado.', color };
  }

  private async ensureNameAvailable(nombre: string, excludeId?: number) {
    const existing = await this.prisma.color.findFirst({
      where: {
        nombre: { equals: nombre, mode: 'insensitive' },
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException('El nombre de color ya está registrado.');
  }

  private throwUniqueConflict(error: unknown): never {
    if (isPrismaError(error, 'P2002')) {
      throw new ConflictException('El nombre de color ya está registrado.');
    }
    throw error;
  }

  private readonly colorSelect = {
    id: true,
    nombre: true,
    codigoHex: true,
    estado: true,
  } satisfies Prisma.ColorSelect;
}
