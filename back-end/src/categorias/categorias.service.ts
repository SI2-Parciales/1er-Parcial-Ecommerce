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
  normalizeOptionalText,
} from '../catalogos/catalogos.utils.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateCategoriaDto,
  ListCategoriasQueryDto,
  UpdateCategoriaDto,
} from './categorias.dto.js';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCategoriaDto) {
    const nombre = normalizeName(input.nombre);
    await this.ensureNameAvailable(nombre);

    try {
      return await this.prisma.categoria.create({
        data: {
          nombre,
          descripcion: normalizeOptionalText(input.descripcion),
          estado: ACTIVE_STATUS,
        },
        select: this.categoriaSelect,
      });
    } catch (error: unknown) {
      this.throwUniqueConflict(error);
    }
  }

  async findAll(query: ListCategoriasQueryDto) {
    const where: Prisma.CategoriaWhereInput = query.includeInactive
      ? {}
      : { estado: ACTIVE_STATUS };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      this.prisma.categoria.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { id: 'desc' },
        select: this.categoriaSelect,
      }),
      this.prisma.categoria.count({ where }),
    ]);
    return { data, meta: { page: query.page, limit: query.limit, total } };
  }

  async findById(id: number) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id },
      select: this.categoriaSelect,
    });
    if (!categoria)
      throw new NotFoundException('No se encontró la categoría solicitada.');
    return categoria;
  }

  async update(id: number, input: UpdateCategoriaDto) {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('Envía al menos un campo para actualizar.');
    }
    await this.findById(id);

    const data: Prisma.CategoriaUpdateInput = {};
    if (input.nombre !== undefined) {
      const nombre = normalizeName(input.nombre);
      await this.ensureNameAvailable(nombre, id);
      data.nombre = nombre;
    }
    if (input.descripcion !== undefined)
      data.descripcion = normalizeOptionalText(input.descripcion);
    if (input.estado !== undefined) data.estado = input.estado;

    try {
      return await this.prisma.categoria.update({
        where: { id },
        data,
        select: this.categoriaSelect,
      });
    } catch (error: unknown) {
      this.throwUniqueConflict(error);
    }
  }

  async deactivate(id: number) {
    const categoria = await this.update(id, { estado: INACTIVE_STATUS });
    return { message: 'Categoría desactivada.', categoria };
  }

  private async ensureNameAvailable(nombre: string, excludeId?: number) {
    const existing = await this.prisma.categoria.findFirst({
      where: {
        nombre: { equals: nombre, mode: 'insensitive' },
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException('El nombre de categoría ya está registrado.');
  }

  private throwUniqueConflict(error: unknown): never {
    if (isPrismaError(error, 'P2002')) {
      throw new ConflictException('El nombre de categoría ya está registrado.');
    }
    throw error;
  }

  private readonly categoriaSelect = {
    id: true,
    nombre: true,
    descripcion: true,
    estado: true,
  } satisfies Prisma.CategoriaSelect;
}
