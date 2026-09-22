import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CanalVenta, EstadoVenta, Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import { createHash } from 'node:crypto';
import { ACTOR_ROLE, ActorRole, ROLE_LEVEL } from '../auth/auth.constants.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { CarritoService } from '../carrito/carrito.service.js';
import { InventarioService } from '../inventario/inventario.service.js';
import {
  VarianteCompra,
  VariantesService,
} from '../productos/variantes/variantes.service.js';
import { normalizeSku } from '../productos/productos.utils.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateVentaDigitalDto,
  CreateVentaDetalleDto,
  CreateVentaPresencialDto,
} from './ventas.dto.js';

interface CurrentActorRow {
  id: number;
  nombre: string;
  apellido: string;
  estado: string;
  sucursalId: number | null;
  role: string;
}

interface LockedBranchRow {
  id: number;
  nombre: string;
  estado: string;
}

interface LockedClientRow {
  id: number;
  estado: string;
  role: string;
}

interface AggregatedSaleLine {
  variante: VarianteCompra;
  cantidad: number;
}

interface LockedSaleRow {
  id: number;
  canal: CanalVenta;
  sucursalId: number;
  total: Prisma.Decimal;
  estado: EstadoVenta;
}

export interface VentaPagoDetalle {
  varianteProductoId: number;
  cantidad: number;
}

export interface VentaPendientePago extends LockedSaleRow {
  detalles: VentaPagoDetalle[];
}

const MAX_POSTGRES_INTEGER = 2_147_483_647;
const MAX_SALE_AMOUNT = new Prisma.Decimal('999999999999.99');
const GENERIC_BILLING_NAME = 'CONSUMIDOR FINAL';
const GENERIC_BILLING_DOCUMENT = '0';

const ventaSelect = {
  id: true,
  canal: true,
  nombreFacturacion: true,
  documentoFacturacion: true,
  fecha: true,
  total: true,
  estado: true,
  sucursal: { select: { id: true, nombre: true } },
  cajero: { select: { id: true, nombre: true, apellido: true } },
  cliente: { select: { id: true, nombre: true, apellido: true } },
  detalles: {
    orderBy: { id: 'asc' as const },
    select: {
      id: true,
      cantidad: true,
      precioUnitario: true,
      subtotal: true,
      varianteProducto: {
        select: {
          id: true,
          sku: true,
          producto: { select: { id: true, nombre: true } },
          talla: { select: { id: true, nombre: true } },
          color: {
            select: { id: true, nombre: true, codigoHex: true },
          },
        },
      },
    },
  },
} satisfies Prisma.VentaSelect;

type VentaRecord = Prisma.VentaGetPayload<{ select: typeof ventaSelect }>;

const idempotentVentaSelect = {
  ...ventaSelect,
  hashSolicitud: true,
} satisfies Prisma.VentaSelect;

type IdempotentVentaRecord = Prisma.VentaGetPayload<{
  select: typeof idempotentVentaSelect;
}>;

@Injectable()
export class VentasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly variantesService: VariantesService,
    private readonly inventarioService: InventarioService,
    private readonly carritoService: CarritoService,
  ) {}

  async createPresencial(
    input: CreateVentaPresencialDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const billing = this.normalizeBilling(input);
    this.validateReferences(input.detalles);

    return this.prisma.$transaction(async (transaction) => {
      const actor = await this.lockActor(transaction, authenticatedUser.id);
      this.authorizeActor(actor);
      const branch = await this.lockActiveBranch(
        transaction,
        actor.sucursalId!,
      );
      await this.validateClient(transaction, input.clienteId);

      const variants = await this.variantesService.resolveActiveForPurchase(
        transaction,
        input.detalles,
      );
      const lines = this.aggregateLines(input.detalles, variants);
      await this.inventarioService.ensureAvailability(
        transaction,
        branch.id,
        lines.map((line) => ({
          varianteProductoId: line.variante.id,
          cantidad: line.cantidad,
        })),
      );

      const { details, total } = this.calculateAmounts(lines);

      const sale = await transaction.venta.create({
        data: {
          canal: CanalVenta.PRESENCIAL,
          sucursalId: branch.id,
          cajeroId: actor.id,
          clienteId: input.clienteId,
          nombreFacturacion: billing.nombre,
          documentoFacturacion: billing.documento,
          total,
          detalles: { create: details },
        },
        select: ventaSelect,
      });
      return this.mapSale(sale);
    });
  }

  async createDigital(
    input: CreateVentaDigitalDto,
    authenticatedUser: AuthenticatedUser,
    idempotencyKey: string | undefined,
  ) {
    if (authenticatedUser.role !== ACTOR_ROLE.CLIENTE) {
      throw new ForbiddenException(
        'Solo los clientes pueden confirmar compras digitales.',
      );
    }
    if (!idempotencyKey || !isUUID(idempotencyKey, '4')) {
      throw new BadRequestException(
        'El encabezado Idempotency-Key debe contener un UUID v4 válido.',
      );
    }
    const billing = this.normalizeDigitalBilling(input);
    const requestHash = this.hashDigitalRequest(authenticatedUser.id, billing);
    const previous = await this.findIdempotentSale(
      authenticatedUser.id,
      idempotencyKey,
    );
    if (previous) {
      return this.resolveIdempotentSale(previous, requestHash);
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const client = await this.authorizeDigitalClient(
          transaction,
          authenticatedUser.id,
        );
        const cart = await this.carritoService.lockForCheckout(
          transaction,
          client.id,
        );
        const branch = await this.lockActiveBranch(
          transaction,
          cart.sucursalId,
        );
        this.validateReferences(cart.detalles);
        const variants = await this.variantesService.resolveActiveForPurchase(
          transaction,
          cart.detalles,
        );
        const lines = this.aggregateLines(cart.detalles, variants);
        await this.inventarioService.ensureAvailability(
          transaction,
          branch.id,
          lines.map((line) => ({
            varianteProductoId: line.variante.id,
            cantidad: line.cantidad,
          })),
        );
        const { details, total } = this.calculateAmounts(lines);
        const sale = await transaction.venta.create({
          data: {
            canal: CanalVenta.DIGITAL,
            sucursalId: branch.id,
            cajeroId: null,
            clienteId: client.id,
            nombreFacturacion: billing.nombre,
            documentoFacturacion: billing.documento,
            total,
            claveIdempotencia: idempotencyKey,
            hashSolicitud: requestHash,
            detalles: { create: details },
          },
          select: ventaSelect,
        });
        return this.mapSale(sale);
      });
    } catch (error: unknown) {
      if (!this.isPrismaError(error, 'P2002')) throw error;
      const concurrent = await this.findIdempotentSale(
        authenticatedUser.id,
        idempotencyKey,
      );
      if (!concurrent) throw error;
      return this.resolveIdempotentSale(concurrent, requestHash);
    }
  }

  async lockPendingForPayment(
    transaction: Prisma.TransactionClient,
    ventaId: number,
  ): Promise<VentaPendientePago> {
    const rows = await transaction.$queryRaw<LockedSaleRow[]>`
      SELECT
        "id" AS "id",
        "canal" AS "canal",
        "sucursal_id" AS "sucursalId",
        "total" AS "total",
        "estado" AS "estado"
      FROM "ventas"
      WHERE "id" = ${ventaId}
      FOR UPDATE
    `;
    const sale = rows[0];
    if (!sale) {
      throw new NotFoundException('No se encontró la venta solicitada.');
    }
    if (sale.estado !== EstadoVenta.PENDIENTE_PAGO) {
      throw new ConflictException('La venta ya no está pendiente de pago.');
    }
    if (sale.total.lessThanOrEqualTo(0)) {
      throw new ConflictException('La venta no tiene un importe válido.');
    }

    const detalles = await transaction.detalleVenta.findMany({
      where: { ventaId },
      orderBy: { varianteProductoId: 'asc' },
      select: { varianteProductoId: true, cantidad: true },
    });
    if (detalles.length === 0) {
      throw new ConflictException('La venta no contiene detalles para cobrar.');
    }
    return { ...sale, detalles };
  }

  async authorizeCashierForBranch(
    transaction: Prisma.TransactionClient,
    authenticatedUser: AuthenticatedUser,
    sucursalId: number,
  ): Promise<CurrentActorRow> {
    const actor = await this.lockActor(transaction, authenticatedUser.id);
    this.authorizeActor(actor);
    if (actor.sucursalId !== sucursalId) {
      throw new ForbiddenException(
        'Solo puedes procesar ventas de tu sucursal asignada.',
      );
    }
    await this.lockActiveBranch(transaction, sucursalId);
    return actor;
  }

  async markPaid(transaction: Prisma.TransactionClient, ventaId: number) {
    return transaction.venta.update({
      where: { id: ventaId },
      data: { estado: EstadoVenta.PAGADA },
      select: { id: true, estado: true, total: true },
    });
  }

  private normalizeBilling(input: CreateVentaPresencialDto) {
    const hasName = input.nombreFacturacion !== undefined;
    const hasDocument = input.documentoFacturacion !== undefined;
    if (hasName !== hasDocument) {
      throw new BadRequestException(
        'El nombre y el documento de facturación deben enviarse juntos.',
      );
    }
    if (!hasName) {
      return {
        nombre: GENERIC_BILLING_NAME,
        documento: GENERIC_BILLING_DOCUMENT,
      };
    }
    const nombre = input.nombreFacturacion!.trim();
    const documento = input.documentoFacturacion!.trim();
    if (!nombre || !documento) {
      throw new BadRequestException(
        'Los datos de facturación no pueden estar vacíos.',
      );
    }
    return { nombre, documento };
  }

  private normalizeDigitalBilling(input: CreateVentaDigitalDto) {
    const nombre = input.nombreFacturacion?.trim();
    const documento = input.documentoFacturacion?.trim();
    if (!nombre || !documento) {
      throw new BadRequestException(
        'El nombre y el documento de facturación son obligatorios.',
      );
    }
    return { nombre, documento };
  }

  private validateReferences(details: CreateVentaDetalleDto[]): void {
    if (!Array.isArray(details) || details.length === 0) {
      throw new BadRequestException(
        'La venta debe incluir al menos un detalle.',
      );
    }
    for (const detail of details) {
      const hasId = detail.varianteProductoId !== undefined;
      const hasSku = detail.sku !== undefined;
      if (hasId === hasSku) {
        throw new BadRequestException(
          'Cada detalle debe identificar la variante por ID o por SKU, pero no por ambos.',
        );
      }
      if (
        !Number.isSafeInteger(detail.cantidad) ||
        detail.cantidad < 1 ||
        detail.cantidad > MAX_POSTGRES_INTEGER
      ) {
        throw new BadRequestException(
          'La cantidad de cada detalle no es válida.',
        );
      }
    }
  }

  private async lockActor(
    transaction: Prisma.TransactionClient,
    userId: number,
  ): Promise<CurrentActorRow> {
    const rows = await transaction.$queryRaw<CurrentActorRow[]>`
      SELECT
        u."id" AS "id",
        u."nombre" AS "nombre",
        u."apellido" AS "apellido",
        u."estado" AS "estado",
        u."sucursal_id" AS "sucursalId",
        r."nombre" AS "role"
      FROM "usuarios" AS u
      INNER JOIN "roles" AS r ON r."id" = u."rol_id"
      WHERE u."id" = ${userId}
      FOR SHARE OF u
    `;
    const actor = rows[0];
    if (!actor || actor.estado !== 'ACTIVO') {
      throw new UnauthorizedException('La cuenta no está disponible.');
    }
    return actor;
  }

  private async authorizeDigitalClient(
    transaction: Prisma.TransactionClient,
    userId: number,
  ): Promise<LockedClientRow> {
    const client = await this.lockClientRecord(transaction, userId);
    if (!client || client.estado !== 'ACTIVO') {
      throw new UnauthorizedException('La cuenta no está disponible.');
    }
    if (client.role !== ACTOR_ROLE.CLIENTE) {
      throw new ForbiddenException(
        'Solo los clientes pueden confirmar compras digitales.',
      );
    }
    return client;
  }

  private authorizeActor(actor: CurrentActorRow): void {
    const actorLevel = ROLE_LEVEL[actor.role as ActorRole];
    if (!actorLevel || actorLevel < ROLE_LEVEL[ACTOR_ROLE.CAJERO]) {
      throw new ForbiddenException(
        'Tu rol no puede registrar ventas presenciales.',
      );
    }
    if (actor.sucursalId === null) {
      throw new ForbiddenException(
        'El usuario no tiene una sucursal asignada.',
      );
    }
  }

  private async lockActiveBranch(
    transaction: Prisma.TransactionClient,
    branchId: number,
  ): Promise<LockedBranchRow> {
    const rows = await transaction.$queryRaw<LockedBranchRow[]>`
      SELECT "id", "nombre", "estado"
      FROM "sucursales"
      WHERE "id" = ${branchId}
      FOR SHARE
    `;
    const branch = rows[0];
    if (!branch) {
      throw new ForbiddenException(
        'La sucursal asignada al usuario no está disponible.',
      );
    }
    if (branch.estado !== 'ACTIVO') {
      throw new ConflictException(
        'La sucursal debe estar activa para registrar una venta.',
      );
    }
    return branch;
  }

  private async validateClient(
    transaction: Prisma.TransactionClient,
    clientId: number | undefined,
  ): Promise<void> {
    if (clientId === undefined) return;
    const client = await this.lockClientRecord(transaction, clientId);
    if (!client) {
      throw new NotFoundException('No se encontró el cliente solicitado.');
    }
    if (client.estado !== 'ACTIVO' || client.role !== ACTOR_ROLE.CLIENTE) {
      throw new ConflictException(
        'El comprador registrado debe ser un cliente activo.',
      );
    }
  }

  private async lockClientRecord(
    transaction: Prisma.TransactionClient,
    clientId: number,
  ): Promise<LockedClientRow | undefined> {
    const rows = await transaction.$queryRaw<LockedClientRow[]>`
      SELECT u."id", u."estado", r."nombre" AS "role"
      FROM "usuarios" AS u
      INNER JOIN "roles" AS r ON r."id" = u."rol_id"
      WHERE u."id" = ${clientId}
      FOR SHARE OF u
    `;
    return rows[0];
  }

  private aggregateLines(
    details: CreateVentaDetalleDto[],
    variants: VarianteCompra[],
  ): AggregatedSaleLine[] {
    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    const bySku = new Map(variants.map((variant) => [variant.sku, variant]));
    const aggregated = new Map<number, AggregatedSaleLine>();

    for (const detail of details) {
      const variant =
        detail.varianteProductoId === undefined
          ? bySku.get(normalizeSku(detail.sku!))
          : byId.get(detail.varianteProductoId);
      if (!variant) {
        throw new NotFoundException(
          'No se encontró una de las variantes solicitadas.',
        );
      }
      const previous = aggregated.get(variant.id);
      const cantidad = (previous?.cantidad ?? 0) + detail.cantidad;
      if (cantidad > MAX_POSTGRES_INTEGER) {
        throw new BadRequestException(
          'La cantidad acumulada de una variante supera el máximo admitido.',
        );
      }
      aggregated.set(variant.id, { variante: variant, cantidad });
    }

    return [...aggregated.values()].sort(
      (left, right) => left.variante.id - right.variante.id,
    );
  }

  private calculateAmounts(lines: AggregatedSaleLine[]) {
    let total = new Prisma.Decimal(0);
    const details = lines.map((line) => {
      const subtotal = line.variante.precio.mul(line.cantidad);
      if (subtotal.greaterThan(MAX_SALE_AMOUNT)) {
        throw new BadRequestException(
          'El subtotal de una variante supera el importe máximo admitido.',
        );
      }
      total = total.plus(subtotal);
      return {
        varianteProductoId: line.variante.id,
        cantidad: line.cantidad,
        precioUnitario: line.variante.precio,
        subtotal,
      };
    });
    if (total.greaterThan(MAX_SALE_AMOUNT)) {
      throw new BadRequestException(
        'El total de la venta supera el importe máximo admitido.',
      );
    }
    return { details, total };
  }

  private hashDigitalRequest(
    clientId: number,
    billing: { nombre: string; documento: string },
  ): string {
    return createHash('sha256')
      .update(JSON.stringify({ clientId, ...billing }))
      .digest('hex');
  }

  private findIdempotentSale(clientId: number, idempotencyKey: string) {
    return this.prisma.venta.findFirst({
      where: {
        canal: CanalVenta.DIGITAL,
        clienteId: clientId,
        claveIdempotencia: idempotencyKey,
      },
      select: idempotentVentaSelect,
    });
  }

  private resolveIdempotentSale(
    previous: IdempotentVentaRecord,
    requestHash: string,
  ) {
    if (previous.hashSolicitud !== requestHash) {
      throw new ConflictException(
        'La clave de idempotencia ya fue utilizada con otra solicitud.',
      );
    }
    const { hashSolicitud: _hashSolicitud, ...sale } = previous;
    return this.mapSale(sale);
  }

  private isPrismaError(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }

  private mapSale(sale: VentaRecord) {
    return {
      id: sale.id,
      canal: sale.canal,
      sucursal: sale.sucursal,
      cajero: sale.cajero,
      cliente: sale.cliente,
      nombreFacturacion: sale.nombreFacturacion,
      documentoFacturacion: sale.documentoFacturacion,
      fecha: sale.fecha,
      total: sale.total.toNumber(),
      estado: sale.estado,
      detalles: sale.detalles.map((detail) => ({
        id: detail.id,
        cantidad: detail.cantidad,
        precioUnitario: detail.precioUnitario.toNumber(),
        subtotal: detail.subtotal.toNumber(),
        variante: detail.varianteProducto,
      })),
    };
  }
}
