import { Module } from '@nestjs/common';
import { ProductosController } from './productos.controller.js';
import { ProductosService } from './productos.service.js';
import { ProductImagesStorageService } from './product-images-storage.service.js';
import { VariantesController } from './variantes/variantes.controller.js';
import { VariantesService } from './variantes/variantes.service.js';

@Module({
  controllers: [ProductosController, VariantesController],
  providers: [ProductosService, ProductImagesStorageService, VariantesService],
})
export class ProductosModule {}
