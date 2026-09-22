import { Module } from '@nestjs/common';
import { DisponibilidadPublicaController } from './disponibilidad-publica.controller.js';
import { InventarioController } from './inventario.controller.js';
import { InventarioService } from './inventario.service.js';
import { MovimientosInventarioController } from './movimientos-inventario.controller.js';
import { MovimientosInventarioService } from './movimientos-inventario.service.js';

@Module({
  controllers: [
    InventarioController,
    MovimientosInventarioController,
    DisponibilidadPublicaController,
  ],
  providers: [InventarioService, MovimientosInventarioService],
  exports: [InventarioService],
})
export class InventarioModule {}
