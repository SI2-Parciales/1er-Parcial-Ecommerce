import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller.js';
import { ReportesService } from './reportes.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
