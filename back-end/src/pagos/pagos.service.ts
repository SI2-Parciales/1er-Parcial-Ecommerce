import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CanalVenta, EstadoPago, MetodoPago, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import {
  CarritoService,
  type CarritoPagoReconciliation,
} from '../carrito/carrito.service.js';
import { MovimientosInventarioService } from '../inventario/movimientos-inventario.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { VentasService } from '../ventas/ventas.service.js';
import {
  ProcessCashPaymentDto,
  ProcessElectronicPaymentDto,
} from './pagos.dto.js';

interface NormalizedPayment {
  metodo: MetodoPago;
  montoRecibido: Prisma.Decimal | null;
  referencia: string | null;
}

const pagoSelect = {
  id: true,
  ventaId: true,
  metodo: true,
  monto: true,
  montoRecibido: true,
  cambio: true,
  referencia: true,
  simulado: true,
  estado: true,
  fecha: true,
} satisfies Prisma.PagoSelect;

type PagoRecord = Prisma.PagoGetPayload<{ select: typeof pagoSelect }>;

@Injectable()
export class PagosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ventasService: VentasService,
    private readonly movimientosService: MovimientosInventarioService,
    private readonly carritoService: CarritoService,
  ) {}

  async processCashierPayment(
    ventaId: number,
    input: ProcessCashPaymentDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const normalized = this.normalizeCashierPayment(input);
    return this.processConfirmedPayment(
      ventaId,
      normalized,
      authenticatedUser,
      CanalVenta.PRESENCIAL,
    );
  }

  async processElectronicPayment(
    ventaId: number,
    input: ProcessElectronicPaymentDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    if (authenticatedUser.role !== ACTOR_ROLE.CLIENTE) {
      throw new ForbiddenException(
        'Solo los clientes pueden pagar compras digitales.',
      );
    }
    const normalized = this.normalizeElectronicPayment(input);
    return this.processConfirmedPayment(
      ventaId,
      normalized,
      authenticatedUser,
      CanalVenta.DIGITAL,
    );
  }

  private async processConfirmedPayment(
    ventaId: number,
    normalized: NormalizedPayment,
    authenticatedUser: AuthenticatedUser,
    expectedChannel: CanalVenta,
  ) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const sale = await this.ventasService.lockPendingForPayment(
          transaction,
          ventaId,
        );
        if (sale.canal !== expectedChannel) {
          throw new ConflictException(
            expectedChannel === CanalVenta.PRESENCIAL
              ? 'El pago en caja solo está disponible para ventas presenciales.'
              : 'El pago electrónico solo está disponible para ventas digitales.',
          );
        }

        let actor: { id: number };
        let reconciliation: CarritoPagoReconciliation | null = null;
        if (expectedChannel === CanalVenta.PRESENCIAL) {
          actor = await this.ventasService.authorizeCashierForBranch(
            transaction,
            authenticatedUser,
            sale.sucursalId,
          );
        } else {
          actor = await this.ventasService.authorizeDigitalBuyerForSale(
            transaction,
            authenticatedUser,
            sale,
          );
          reconciliation =
            await this.carritoService.preparePaidSaleReconciliation(
              transaction,
              actor.id,
              sale.fecha,
              sale.detalles,
            );
        }
        const amounts = this.calculateAmounts(normalized, sale.total);

        await this.movimientosService.registerSaleOutputs(
          transaction,
          sale.id,
          actor.id,
          sale.sucursalId,
          sale.detalles,
        );
        const payment = await transaction.pago.create({
          data: {
            ventaId: sale.id,
            metodo: normalized.metodo,
            monto: sale.total,
            montoRecibido: amounts.montoRecibido,
            cambio: amounts.cambio,
            referencia: normalized.referencia,
            simulado: true,
            estado: EstadoPago.CONFIRMADO,
          },
          select: pagoSelect,
        });
        const paidSale = await this.ventasService.markPaid(
          transaction,
          sale.id,
        );
        if (reconciliation) {
          await this.carritoService.applyPaidSaleReconciliation(
            transaction,
            reconciliation,
          );
        }

        return {
          pago: this.mapPayment(payment),
          venta: {
            id: paidSale.id,
            estado: paidSale.estado,
            total: paidSale.total.toNumber(),
          },
        };
      });
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          'La venta ya tiene un pago confirmado o movimientos registrados.',
        );
      }
      throw error;
    }
  }

  private normalizeCashierPayment(
    input: ProcessCashPaymentDto,
  ): NormalizedPayment {
    const referencia = input.referencia?.trim() || null;
    switch (input.metodo) {
      case MetodoPago.EFECTIVO:
        if (input.montoRecibido === undefined) {
          throw new BadRequestException(
            'El monto recibido es obligatorio para pagos en efectivo.',
          );
        }
        if (referencia !== null) {
          throw new BadRequestException(
            'Los pagos en efectivo no admiten una referencia.',
          );
        }
        return {
          metodo: input.metodo,
          montoRecibido: new Prisma.Decimal(input.montoRecibido),
          referencia: null,
        };
      case MetodoPago.TARJETA:
      case MetodoPago.QR:
        if (input.montoRecibido !== undefined) {
          throw new BadRequestException(
            'El monto recibido solo puede enviarse para pagos en efectivo.',
          );
        }
        return { metodo: input.metodo, montoRecibido: null, referencia };
      default:
        throw new BadRequestException('El método de pago no es válido.');
    }
  }

  private normalizeElectronicPayment(
    input: ProcessElectronicPaymentDto,
  ): NormalizedPayment {
    if (
      input.metodo !== MetodoPago.TARJETA &&
      input.metodo !== MetodoPago.QR
    ) {
      throw new BadRequestException(
        'El pago electrónico solo admite TARJETA o QR.',
      );
    }
    return {
      metodo: input.metodo,
      montoRecibido: null,
      referencia: `SIM-${input.metodo}-${randomUUID()}`,
    };
  }

  private calculateAmounts(payment: NormalizedPayment, total: Prisma.Decimal) {
    if (payment.metodo !== MetodoPago.EFECTIVO) {
      return { montoRecibido: null, cambio: null };
    }
    if (payment.montoRecibido!.lessThan(total)) {
      throw new BadRequestException(
        'El monto recibido es insuficiente para completar la venta.',
      );
    }
    return {
      montoRecibido: payment.montoRecibido,
      cambio: payment.montoRecibido!.minus(total),
    };
  }

  private mapPayment(payment: PagoRecord) {
    return {
      id: payment.id,
      ventaId: payment.ventaId,
      metodo: payment.metodo,
      monto: payment.monto.toNumber(),
      montoRecibido: payment.montoRecibido?.toNumber() ?? null,
      cambio: payment.cambio?.toNumber() ?? null,
      referencia: payment.referencia,
      simulado: payment.simulado,
      estado: payment.estado,
      fecha: payment.fecha,
    };
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
