import { Module } from '@nestjs/common';
import { TallasController } from './tallas.controller.js';
import { TallasService } from './tallas.service.js';

@Module({
  controllers: [TallasController],
  providers: [TallasService],
})
export class TallasModule {}
