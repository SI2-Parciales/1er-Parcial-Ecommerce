import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateColorDto } from './colores.dto.js';
import { ColoresService } from './colores.service.js';

describe('ColoresService', () => {
  const prisma = {
    color: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  let service: ColoresService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.color.findFirst.mockResolvedValue(null);
    service = new ColoresService(prisma as unknown as PrismaService);
  });

  it('valida hexadecimal, lo normaliza y crea un color activo', async () => {
    const validDto = plainToInstance(CreateColorDto, {
      nombre: ' Rojo ',
      codigoHex: ' #ff5733 ',
    });
    await expect(validate(validDto)).resolves.toHaveLength(0);
    expect(validDto.codigoHex).toBe('#FF5733');

    prisma.color.create.mockResolvedValue({
      id: 1,
      nombre: 'Rojo',
      codigoHex: '#FF5733',
      estado: 'ACTIVO',
    });
    await service.create(validDto);
    expect(prisma.color.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { nombre: 'Rojo', codigoHex: '#FF5733', estado: 'ACTIVO' },
      }),
    );
  });

  it('rechaza códigos hexadecimales inválidos', async () => {
    const invalidDto = plainToInstance(CreateColorDto, {
      nombre: 'Rojo',
      codigoHex: '#FFF',
    });
    expect(await validate(invalidDto)).not.toHaveLength(0);
  });
});
