import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller.js';
import { ReportesService } from './reportes.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { InventarioModule } from '../inventario/inventario.module.js';
import { ReportQueryController } from './query/report-query.controller.js';
import { ReportQueryService } from './query/report-query.service.js';

@Module({
  imports: [PrismaModule, InventarioModule],
  controllers: [ReportesController, ReportQueryController],
  providers: [ReportesService, ReportQueryService],
  exports: [ReportesService],
})
export class ReportesModule {}
