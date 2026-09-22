import { Module } from '@nestjs/common';
import { DemoAccessController } from './demo-access.controller.js';

@Module({
  controllers: [DemoAccessController],
})
export class DemoModule {}
