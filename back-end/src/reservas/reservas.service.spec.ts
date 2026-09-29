import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EstadoReserva } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { VariantesService } from '../productos/variantes/variantes.service.js';
import { ReservasService } from './reservas.service.js';

describe('ReservasService', () => {
  const client: AuthenticatedUser = {
    id: 7,
    email: 'cliente@example.test',
    nombre: 'Cliente',
    role: ACTOR_ROLE.CLIENTE,
  };
  let service: ReservasService;
  let prisma: Record<string, any>;
  let transaction: Record<string, any>;
  let variantesService: { resolveActiveForPurchase: ReturnType<typeof vi.fn> };
  let inventarioService: {
    reserveForCustomer: ReturnType<typeof vi.fn>;
    releaseCustomerReservation: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 3, estado: 'ACTIVO' }]),
      reserva: {
        create: vi.fn().mockResolvedValue({ id: 31 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 31 }),
        update: vi.fn().mockResolvedValue({ id: 31 }),
      },
      detalleReserva: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn().mockResolvedValue(1),
      },
    };
    prisma = {
      $transaction: vi.fn((callback: (tx: unknown) => unknown) =>
        callback(transaction),
      ),
      reserva: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    variantesService = {
      resolveActiveForPurchase: vi
        .fn()
        .mockImplementation(
          async (
            _transaction,
            references: Array<{ varianteProductoId: number }>,
          ) =>
            references.map(({ varianteProductoId }) => ({
              id: varianteProductoId,
            })),
        ),
    };
    inventarioService = {
      reserveForCustomer: vi.fn().mockResolvedValue(undefined),
      releaseCustomerReservation: vi.fn().mockResolvedValue(undefined),
    };
    service = new ReservasService(
      prisma as unknown as PrismaService,
      variantesService as unknown as VariantesService,
      inventarioService as unknown as InventarioService,
    );
  });

  it('crea una reserva y consolida variantes repetidas en una transacción', async () => {
    await service.create(
      {
        sucursalId: 3,
        fechaHora: '2026-10-15T14:30:00-04:00',
        items: [
          { varianteProductoId: 12, cantidad: 1 },
          { varianteProductoId: 14, cantidad: 2 },
          { varianteProductoId: 12, cantidad: 3 },
        ],
      },
      client,
    );

    expect(inventarioService.reserveForCustomer).toHaveBeenCalledWith(
      transaction,
      3,
      [
        { varianteProductoId: 12, cantidad: 4 },
        { varianteProductoId: 14, cantidad: 2 },
      ],
    );
    expect(transaction.reserva.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clienteId: client.id,
          estado: EstadoReserva.PENDIENTE,
          detalles: {
            create: [
              { varianteProductoId: 12, cantidad: 4 },
              { varianteProductoId: 14, cantidad: 2 },
            ],
          },
        }),
      }),
    );
  });

  it('no crea la reserva si no hay stock suficiente', async () => {
    inventarioService.reserveForCustomer.mockRejectedValue(
      new ConflictException('stock'),
    );
    await expect(
      service.create(
        {
          sucursalId: 3,
          fechaHora: '2026-10-15T14:30:00-04:00',
          items: [{ varianteProductoId: 12, cantidad: 1 }],
        },
        client,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.reserva.create).not.toHaveBeenCalled();
  });

  it('no crea la reserva cuando una variante no existe', async () => {
    variantesService.resolveActiveForPurchase.mockRejectedValue(
      new NotFoundException('variant'),
    );
    await expect(
      service.create(
        {
          sucursalId: 3,
          fechaHora: '2026-10-15T14:30:00-04:00',
          items: [{ varianteProductoId: 999, cantidad: 1 }],
        },
        client,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(inventarioService.reserveForCustomer).not.toHaveBeenCalled();
    expect(transaction.reserva.create).not.toHaveBeenCalled();
  });

  it('rechaza solicitudes inválidas y actores que no son clientes', async () => {
    await expect(
      service.create(
        { sucursalId: 3, fechaHora: 'invalid', items: [] },
        client,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.findAll(
        { page: 1, limit: 20 },
        { ...client, role: ACTOR_ROLE.ADMINISTRADOR },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('no revela reservas ajenas o inexistentes', async () => {
    prisma.reserva.findFirst.mockResolvedValue(null);
    await expect(service.findOne(31, client)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.reserva.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 31, clienteId: client.id } }),
    );
  });

  it('permite reducir cantidad y libera únicamente la diferencia', async () => {
    transaction.$queryRaw.mockResolvedValueOnce([
      { id: 31, estado: EstadoReserva.PENDIENTE, sucursalId: 3 },
    ]);
    transaction.detalleReserva.findFirst.mockResolvedValue({
      id: 41,
      varianteProductoId: 12,
      cantidad: 4,
    });

    await service.updateDetail(31, 41, { cantidad: 2 }, client);

    expect(inventarioService.releaseCustomerReservation).toHaveBeenCalledWith(
      transaction,
      3,
      [{ varianteProductoId: 12, cantidad: 2 }],
    );
    expect(transaction.detalleReserva.update).toHaveBeenCalledWith({
      where: { id: 41 },
      data: { cantidad: 2 },
    });
  });

  it('rechaza aumentar una cantidad existente', async () => {
    transaction.$queryRaw.mockResolvedValueOnce([
      { id: 31, estado: EstadoReserva.PENDIENTE, sucursalId: 3 },
    ]);
    transaction.detalleReserva.findFirst.mockResolvedValue({
      id: 41,
      varianteProductoId: 12,
      cantidad: 2,
    });
    await expect(
      service.updateDetail(31, 41, { cantidad: 3 }, client),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(inventarioService.releaseCustomerReservation).not.toHaveBeenCalled();
  });

  it.each([EstadoReserva.EN_PROCESO, EstadoReserva.FINALIZADA])(
    'no permite modificar detalles cuando la reserva está %s',
    async (estado) => {
      transaction.$queryRaw.mockResolvedValueOnce([
        { id: 31, estado, sucursalId: 3 },
      ]);
      await expect(
        service.updateDetail(31, 41, { cantidad: 1 }, client),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(transaction.detalleReserva.findFirst).not.toHaveBeenCalled();
      expect(
        inventarioService.releaseCustomerReservation,
      ).not.toHaveBeenCalled();
    },
  );

  it('cancela la reserva al quitar el último detalle y libera sus unidades', async () => {
    transaction.$queryRaw.mockResolvedValueOnce([
      { id: 31, estado: EstadoReserva.PENDIENTE, sucursalId: 3 },
    ]);
    transaction.detalleReserva.findFirst.mockResolvedValue({
      id: 41,
      varianteProductoId: 12,
      cantidad: 2,
    });
    transaction.detalleReserva.count.mockResolvedValue(0);

    await service.removeDetail(31, 41, client);

    expect(inventarioService.releaseCustomerReservation).toHaveBeenCalledWith(
      transaction,
      3,
      [{ varianteProductoId: 12, cantidad: 2 }],
    );
    expect(transaction.reserva.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 31 },
        data: expect.objectContaining({ estado: EstadoReserva.CANCELADA }),
      }),
    );
  });

  it('cancela una reserva pendiente y una repetición no libera stock otra vez', async () => {
    transaction.$queryRaw.mockResolvedValueOnce([
      { id: 31, estado: EstadoReserva.PENDIENTE, sucursalId: 3 },
    ]);
    transaction.detalleReserva.findMany.mockResolvedValue([
      { varianteProductoId: 12, cantidad: 2 },
    ]);
    await service.cancel(31, client);
    expect(inventarioService.releaseCustomerReservation).toHaveBeenCalledTimes(
      1,
    );
    expect(transaction.reserva.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estado: EstadoReserva.CANCELADA }),
      }),
    );

    transaction.$queryRaw.mockResolvedValueOnce([
      { id: 31, estado: EstadoReserva.CANCELADA, sucursalId: 3 },
    ]);
    await service.cancel(31, client);
    expect(inventarioService.releaseCustomerReservation).toHaveBeenCalledTimes(
      1,
    );
  });

  it.each([EstadoReserva.EN_PROCESO, EstadoReserva.FINALIZADA])(
    'no permite cancelar una reserva %s',
    async (estado) => {
      transaction.$queryRaw.mockResolvedValueOnce([
        { id: 31, estado, sucursalId: 3 },
      ]);
      await expect(service.cancel(31, client)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(
        inventarioService.releaseCustomerReservation,
      ).not.toHaveBeenCalled();
    },
  );
});
