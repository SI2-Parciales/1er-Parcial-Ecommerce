import { Module } from '@nestjs/common';
import { InventarioModule } from '../inventario/inventario.module.js';
import { ProductosModule } from '../productos/productos.module.js';
import { ReservasController } from './reservas.controller.js';
import { ReservasService } from './reservas.service.js';

@Module({
  imports: [InventarioModule, ProductosModule],
  controllers: [ReservasController],
  providers: [ReservasService],
  exports: [ReservasService],
})
export class ReservasModule {}
