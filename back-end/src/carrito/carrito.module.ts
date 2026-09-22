import { Module } from '@nestjs/common';
import { InventarioModule } from '../inventario/inventario.module.js';
import { ProductosModule } from '../productos/productos.module.js';
import { CarritoController } from './carrito.controller.js';
import { CarritoService } from './carrito.service.js';

@Module({
  imports: [ProductosModule, InventarioModule],
  controllers: [CarritoController],
  providers: [CarritoService],
  exports: [CarritoService],
})
export class CarritoModule {}
