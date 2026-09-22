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
import { CarritoService } from '../carrito/carrito.service.js';
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
    authorizeDigitalBuyerForSale: vi.fn(),
    markPaid: vi.fn(),
  };
  const movimientos = { registerSaleOutputs: vi.fn() };
  const carrito = {
    preparePaidSaleReconciliation: vi.fn(),
    applyPaidSaleReconciliation: vi.fn(),
  };
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
    clienteId: null,
    total: new Prisma.Decimal('129.90'),
    estado: EstadoVenta.PENDIENTE_PAGO,
    fecha: new Date('2026-09-22T14:00:00.000Z'),
    detalles: [{ varianteProductoId: 11, cantidad: 2 }],
  };
  const customer: AuthenticatedUser = {
    id: 30,
    nombre: 'Cliente',
    email: 'cliente@example.test',
    role: 'CLIENTE',
  };
  const reconciliation = {
    carritoId: 5,
    eliminarDetalleIds: [8],
    actualizarDetalles: [],
  };
  let service: PagosService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PagosService(
      prisma as unknown as PrismaService,
      ventas as unknown as VentasService,
      movimientos as unknown as MovimientosInventarioService,
      carrito as unknown as CarritoService,
    );
    ventas.lockPendingForPayment.mockResolvedValue(sale);
    ventas.authorizeCashierForBranch.mockResolvedValue({ id: 7 });
    ventas.authorizeDigitalBuyerForSale.mockResolvedValue({ id: 30 });
    ventas.markPaid.mockResolvedValue({
      id: 20,
      estado: EstadoVenta.PAGADA,
      total: sale.total,
    });
    movimientos.registerSaleOutputs.mockResolvedValue([]);
    carrito.preparePaidSaleReconciliation.mockResolvedValue(reconciliation);
    carrito.applyPaidSaleReconciliation.mockResolvedValue(undefined);
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

  it.each([MetodoPago.TARJETA, MetodoPago.QR])(
    'confirma un pago electrónico %s con referencia interna',
    async (metodo) => {
      const digitalSale = {
        ...sale,
        canal: CanalVenta.DIGITAL,
        clienteId: 30,
      };
      ventas.lockPendingForPayment.mockResolvedValue(digitalSale);
      transaction.pago.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => ({
          id: 32,
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

      const result = await service.processElectronicPayment(
        20,
        { metodo },
        customer,
      );

      expect(ventas.authorizeDigitalBuyerForSale).toHaveBeenCalledWith(
        transaction,
        customer,
        digitalSale,
      );
      expect(carrito.preparePaidSaleReconciliation).toHaveBeenCalledWith(
        transaction,
        30,
        sale.fecha,
        sale.detalles,
      );
      expect(movimientos.registerSaleOutputs).toHaveBeenCalledWith(
        transaction,
        20,
        30,
        2,
        sale.detalles,
      );
      expect(transaction.pago.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metodo,
            monto: sale.total,
            montoRecibido: null,
            cambio: null,
            referencia: expect.stringMatching(
              new RegExp(`^SIM-${metodo}-[0-9a-f-]{36}$`),
            ),
          }),
        }),
      );
      expect(carrito.applyPaidSaleReconciliation).toHaveBeenCalledWith(
        transaction,
        reconciliation,
      );
      expect(result.pago).toMatchObject({
        metodo,
        monto: 129.9,
        montoRecibido: null,
        cambio: null,
        referencia: expect.stringMatching(`^SIM-${metodo}-`),
        simulado: true,
      });
    },
  );

  it('rechaza EFECTIVO antes de abrir la transacción electrónica', async () => {
    await expect(
      service.processElectronicPayment(
        20,
        { metodo: MetodoPago.EFECTIVO },
        customer,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza actores que no sean clientes antes de leer la venta', async () => {
    await expect(
      service.processElectronicPayment(
        20,
        { metodo: MetodoPago.QR },
        { ...user, role: 'ADMINISTRADOR' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(ventas.lockPendingForPayment).not.toHaveBeenCalled();
  });

  it('rechaza ventas presenciales o de otro comprador por el flujo electrónico', async () => {
    await expect(
      service.processElectronicPayment(
        20,
        { metodo: MetodoPago.QR },
        customer,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    ventas.lockPendingForPayment.mockResolvedValueOnce({
      ...sale,
      canal: CanalVenta.DIGITAL,
      clienteId: 31,
    });
    ventas.authorizeDigitalBuyerForSale.mockRejectedValueOnce(
      new ForbiddenException('Venta ajena.'),
    );
    await expect(
      service.processElectronicPayment(
        20,
        { metodo: MetodoPago.TARJETA },
        customer,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(movimientos.registerSaleOutputs).not.toHaveBeenCalled();
  });

  it('no aplica la limpieza del carrito si falla la confirmación digital', async () => {
    ventas.lockPendingForPayment.mockResolvedValue({
      ...sale,
      canal: CanalVenta.DIGITAL,
      clienteId: 30,
    });
    movimientos.registerSaleOutputs.mockRejectedValue(
      new ConflictException('Sin existencias.'),
    );

    await expect(
      service.processElectronicPayment(
        20,
        { metodo: MetodoPago.QR },
        customer,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.pago.create).not.toHaveBeenCalled();
    expect(ventas.markPaid).not.toHaveBeenCalled();
    expect(carrito.applyPaidSaleReconciliation).not.toHaveBeenCalled();
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
