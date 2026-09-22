import { Module } from '@nestjs/common';
import { InventarioModule } from '../inventario/inventario.module.js';
import { VentasModule } from '../ventas/ventas.module.js';
import { PagosController } from './pagos.controller.js';
import { PagosService } from './pagos.service.js';

@Module({
  imports: [VentasModule, InventarioModule],
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
