import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  CanalVenta,
  EstadoPago,
  EstadoVenta,
  MetodoPago,
  Prisma,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { MovimientosInventarioService } from '../inventario/movimientos-inventario.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { VentasService } from '../ventas/ventas.service.js';
import { PagosService } from './pagos.service.js';

describe('PagosService', () => {
  const transaction = {
    pago: { create: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };
  const ventas = {
    lockPendingForPayment: vi.fn(),
    authorizeCashierForBranch: vi.fn(),
    markPaid: vi.fn(),
  };
  const movimientos = { registerSaleOutputs: vi.fn() };
  const user: AuthenticatedUser = {
    id: 7,
    nombre: 'Cajero',
    email: 'cajero@example.test',
    role: 'CAJERO',
  };
  const sale = {
    id: 20,
    canal: CanalVenta.PRESENCIAL,
    sucursalId: 2,
    total: new Prisma.Decimal('129.90'),
    estado: EstadoVenta.PENDIENTE_PAGO,
    detalles: [{ varianteProductoId: 11, cantidad: 2 }],
  };
  let service: PagosService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PagosService(
      prisma as unknown as PrismaService,
      ventas as unknown as VentasService,
      movimientos as unknown as MovimientosInventarioService,
    );
    ventas.lockPendingForPayment.mockResolvedValue(sale);
    ventas.authorizeCashierForBranch.mockResolvedValue({ id: 7 });
    ventas.markPaid.mockResolvedValue({
      id: 20,
      estado: EstadoVenta.PAGADA,
      total: sale.total,
    });
    movimientos.registerSaleOutputs.mockResolvedValue([]);
  });

  it('confirma efectivo usando el total real y calcula el cambio', async () => {
    transaction.pago.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({
        id: 30,
        ventaId: 20,
        metodo: data.metodo,
        monto: data.monto,
        montoRecibido: data.montoRecibido,
        cambio: data.cambio,
        referencia: data.referencia,
        simulado: true,
        estado: EstadoPago.CONFIRMADO,
        fecha: new Date('2026-09-22T15:00:00.000Z'),
      }),
    );

    const result = await service.processCashierPayment(
      20,
      { metodo: MetodoPago.EFECTIVO, montoRecibido: 150 },
      user,
    );

    expect(movimientos.registerSaleOutputs).toHaveBeenCalledWith(
      transaction,
      20,
      7,
      2,
      sale.detalles,
    );
    expect(transaction.pago.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          monto: new Prisma.Decimal('129.90'),
          montoRecibido: new Prisma.Decimal('150'),
          cambio: new Prisma.Decimal('20.10'),
          referencia: null,
          simulado: true,
        }),
      }),
    );
    expect(result).toMatchObject({
      pago: {
        metodo: 'EFECTIVO',
        monto: 129.9,
        montoRecibido: 150,
        cambio: 20.1,
        estado: 'CONFIRMADO',
      },
      venta: { id: 20, estado: 'PAGADA', total: 129.9 },
    });
  });

  it.each([
    [MetodoPago.TARJETA, 'AUT-SIM-1'],
    [MetodoPago.QR, undefined],
  ])('confirma %s como pago simulado', async (metodo, referencia) => {
    transaction.pago.create.mockResolvedValue({
      id: 31,
      ventaId: 20,
      metodo,
      monto: sale.total,
      montoRecibido: null,
      cambio: null,
      referencia: referencia ?? null,
      simulado: true,
      estado: EstadoPago.CONFIRMADO,
      fecha: new Date('2026-09-22T15:00:00.000Z'),
    });

    const result = await service.processCashierPayment(
      20,
      { metodo, referencia },
      user,
    );

    expect(result.pago).toMatchObject({
      metodo,
      montoRecibido: null,
      cambio: null,
      referencia: referencia ?? null,
      simulado: true,
    });
  });

  it('rechaza efectivo insuficiente antes de modificar inventario', async () => {
    await expect(
      service.processCashierPayment(
        20,
        { metodo: MetodoPago.EFECTIVO, montoRecibido: 100 },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(movimientos.registerSaleOutputs).not.toHaveBeenCalled();
    expect(transaction.pago.create).not.toHaveBeenCalled();
  });

  it('rechaza campos incompatibles antes de abrir una transacción', async () => {
    await expect(
      service.processCashierPayment(20, { metodo: MetodoPago.EFECTIVO }, user),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.processCashierPayment(
        20,
        { metodo: MetodoPago.TARJETA, montoRecibido: 130 },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.processCashierPayment(
        20,
        {
          metodo: MetodoPago.EFECTIVO,
          montoRecibido: 130,
          referencia: 'NO-ADMISIBLE',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza ventas digitales y propaga restricciones de sucursal', async () => {
    ventas.lockPendingForPayment.mockResolvedValueOnce({
      ...sale,
      canal: CanalVenta.DIGITAL,
    });
    await expect(
      service.processCashierPayment(20, { metodo: MetodoPago.QR }, user),
    ).rejects.toBeInstanceOf(ConflictException);

    ventas.authorizeCashierForBranch.mockRejectedValueOnce(
      new ForbiddenException('Otra sucursal.'),
    );
    await expect(
      service.processCashierPayment(20, { metodo: MetodoPago.QR }, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.pago.create).not.toHaveBeenCalled();
  });

  it('no registra pago ni cambia la venta cuando falla la salida de inventario', async () => {
    movimientos.registerSaleOutputs.mockRejectedValue(
      new ConflictException('Sin existencias.'),
    );
    await expect(
      service.processCashierPayment(20, { metodo: MetodoPago.QR }, user),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.pago.create).not.toHaveBeenCalled();
    expect(ventas.markPaid).not.toHaveBeenCalled();
  });

  it('convierte restricciones únicas concurrentes en conflicto', async () => {
    transaction.pago.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      service.processCashierPayment(20, { metodo: MetodoPago.QR }, user),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(ventas.markPaid).not.toHaveBeenCalled();
  });
});
