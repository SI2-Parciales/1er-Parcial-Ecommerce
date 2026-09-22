import { Module } from '@nestjs/common';
import { InventarioModule } from '../inventario/inventario.module.js';
import { CarritoModule } from '../carrito/carrito.module.js';
import { ProductosModule } from '../productos/productos.module.js';
import { VentasController } from './ventas.controller.js';
import { VentasService } from './ventas.service.js';

@Module({
  imports: [ProductosModule, InventarioModule, CarritoModule],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
