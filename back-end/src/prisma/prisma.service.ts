import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      transactionOptions: {
        maxWait: 10_000,
        timeout: 20_000,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      console.log('✅ Conexión con PostgreSQL establecida.');
    } catch (err: any) {
      console.warn('⚠️ Advertencia: Conexión inicial diferida con base de datos:', err?.message || err);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
