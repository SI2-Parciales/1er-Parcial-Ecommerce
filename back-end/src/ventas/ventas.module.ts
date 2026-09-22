import { Module } from '@nestjs/common';
import { InventarioModule } from '../inventario/inventario.module.js';
import { ProductosModule } from '../productos/productos.module.js';
import { VentasController } from './ventas.controller.js';
import { VentasService } from './ventas.service.js';

@Module({
  imports: [ProductosModule, InventarioModule],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
