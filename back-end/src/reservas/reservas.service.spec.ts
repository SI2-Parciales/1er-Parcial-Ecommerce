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
      usuario: { findUnique: vi.fn() },
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

  it('rechaza solicitudes inválidas y protege roles que no consultan reservas', async () => {
    await expect(
      service.create(
        { sucursalId: 3, fechaHora: 'invalid', items: [] },
        client,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.findAll(
        { page: 1, limit: 20 },
        { ...client, role: ACTOR_ROLE.CAJERO },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('mantiene las consultas de cliente limitadas a sus reservas', async () => {
    await service.findAll({ page: 1, limit: 20 }, client);
    expect(prisma.reserva.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clienteId: client.id } }),
    );
  });

  it('limita consultas de encargado a su sucursal y rechaza otra sucursal', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 21,
      estado: 'ACTIVO',
      sucursalId: 3,
      rol: { nombre: ACTOR_ROLE.ENCARGADO_SUCURSAL },
    });
    const manager = { ...client, id: 21, role: ACTOR_ROLE.ENCARGADO_SUCURSAL };
    await service.findAll(
      { page: 1, limit: 20, estado: EstadoReserva.PENDIENTE },
      manager,
    );
    expect(prisma.reserva.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sucursalId: 3, estado: EstadoReserva.PENDIENTE },
      }),
    );
    await expect(
      service.findAll({ page: 1, limit: 20, sucursalId: 99 }, manager),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permite al administrador consultar globalmente y aplicar filtros', async () => {
    const administrator = { ...client, role: ACTOR_ROLE.ADMINISTRADOR };
    await service.findAll(
      {
        page: 1,
        limit: 20,
        sucursalId: 9,
        clienteId: 15,
        estado: EstadoReserva.FINALIZADA,
      },
      administrator,
    );
    expect(prisma.reserva.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sucursalId: 9,
          clienteId: 15,
          estado: EstadoReserva.FINALIZADA,
        },
      }),
    );
  });

  it('no filtra por sucursal solicitada al consultar como cliente', async () => {
    await service.findAll({ page: 1, limit: 20, sucursalId: 99 }, client);
    expect(prisma.reserva.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clienteId: client.id, sucursalId: 99 },
      }),
    );
  });

  it('permite iniciar preparación sin tocar inventario', async () => {
    transaction.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 21,
          estado: 'ACTIVO',
          sucursalId: 3,
          role: ACTOR_ROLE.ENCARGADO_SUCURSAL,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 31,
          estado: EstadoReserva.PENDIENTE,
          sucursalId: 3,
        },
      ]);
    const manager = { ...client, id: 21, role: ACTOR_ROLE.ENCARGADO_SUCURSAL };

    await service.startPreparation(31, manager);

    expect(transaction.reserva.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 31 },
        data: expect.objectContaining({ estado: EstadoReserva.EN_PROCESO }),
      }),
    );
    expect(inventarioService.releaseCustomerReservation).not.toHaveBeenCalled();
  });

  it('rechaza iniciar preparación si la reserva no pertenece a la sucursal', async () => {
    transaction.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 21,
          estado: 'ACTIVO',
          sucursalId: 3,
          role: ACTOR_ROLE.ENCARGADO_SUCURSAL,
        },
      ])
      .mockResolvedValueOnce([]);
    const manager = { ...client, id: 21, role: ACTOR_ROLE.ENCARGADO_SUCURSAL };
    await expect(service.startPreparation(31, manager)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(transaction.reserva.update).not.toHaveBeenCalled();
  });

  it('rechaza al encargado sin sucursal asignada', async () => {
    transaction.$queryRaw.mockResolvedValueOnce([
      {
        id: 21,
        estado: 'ACTIVO',
        sucursalId: null,
        role: ACTOR_ROLE.ENCARGADO_SUCURSAL,
      },
    ]);
    const manager = { ...client, id: 21, role: ACTOR_ROLE.ENCARGADO_SUCURSAL };
    await expect(service.startPreparation(31, manager)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(transaction.reserva.update).not.toHaveBeenCalled();
  });

  it.each([
    EstadoReserva.CANCELADA,
    EstadoReserva.EN_PROCESO,
    EstadoReserva.FINALIZADA,
  ])('no permite iniciar desde el estado %s', async (estado) => {
    transaction.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 21,
          estado: 'ACTIVO',
          sucursalId: 3,
          role: ACTOR_ROLE.ENCARGADO_SUCURSAL,
        },
      ])
      .mockResolvedValueOnce([{ id: 31, estado, sucursalId: 3 }]);
    const manager = {
      ...client,
      id: 21,
      role: ACTOR_ROLE.ENCARGADO_SUCURSAL,
    };
    await expect(service.startPreparation(31, manager)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(transaction.reserva.update).not.toHaveBeenCalled();
  });

  it.each([
    EstadoReserva.CANCELADA,
    EstadoReserva.PENDIENTE,
    EstadoReserva.FINALIZADA,
  ])('no permite finalizar desde el estado %s', async (estado) => {
    transaction.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 21,
          estado: 'ACTIVO',
          sucursalId: 3,
          role: ACTOR_ROLE.ENCARGADO_SUCURSAL,
        },
      ])
      .mockResolvedValueOnce([{ id: 31, estado, sucursalId: 3 }]);
    const manager = {
      ...client,
      id: 21,
      role: ACTOR_ROLE.ENCARGADO_SUCURSAL,
    };
    await expect(service.finalize(31, manager)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(inventarioService.releaseCustomerReservation).not.toHaveBeenCalled();
    expect(transaction.reserva.update).not.toHaveBeenCalled();
  });

  it('finaliza en proceso y libera todas las unidades dentro de la transacción', async () => {
    transaction.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 21,
          estado: 'ACTIVO',
          sucursalId: 3,
          role: ACTOR_ROLE.ENCARGADO_SUCURSAL,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 31,
          estado: EstadoReserva.EN_PROCESO,
          sucursalId: 3,
        },
      ]);
    transaction.detalleReserva.findMany.mockResolvedValue([
      { varianteProductoId: 12, cantidad: 2 },
      { varianteProductoId: 14, cantidad: 1 },
    ]);
    const manager = { ...client, id: 21, role: ACTOR_ROLE.ENCARGADO_SUCURSAL };

    await service.finalize(31, manager);

    expect(inventarioService.releaseCustomerReservation).toHaveBeenCalledWith(
      transaction,
      3,
      [
        { varianteProductoId: 12, cantidad: 2 },
        { varianteProductoId: 14, cantidad: 1 },
      ],
    );
    expect(transaction.reserva.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 31 },
        data: expect.objectContaining({ estado: EstadoReserva.FINALIZADA }),
      }),
    );
  });

  it('revierte la finalización si no puede liberar el inventario', async () => {
    transaction.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 21,
          estado: 'ACTIVO',
          sucursalId: 3,
          role: ACTOR_ROLE.ENCARGADO_SUCURSAL,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 31,
          estado: EstadoReserva.EN_PROCESO,
          sucursalId: 3,
        },
      ]);
    transaction.detalleReserva.findMany.mockResolvedValue([
      { varianteProductoId: 12, cantidad: 2 },
    ]);
    inventarioService.releaseCustomerReservation.mockRejectedValue(
      new ConflictException('inventory'),
    );
    const manager = { ...client, id: 21, role: ACTOR_ROLE.ENCARGADO_SUCURSAL };

    await expect(service.finalize(31, manager)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(transaction.reserva.update).not.toHaveBeenCalled();
  });

  it.each([
    [ACTOR_ROLE.CLIENTE, ACTOR_ROLE.CLIENTE],
    [ACTOR_ROLE.ADMINISTRADOR, ACTOR_ROLE.ADMINISTRADOR],
  ])('no permite que el rol %s cambie estados', async (_label, role) => {
    await expect(
      service.startPreparation(31, { ...client, role }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
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
