import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { MinimumRoleGuard } from './auth/guards/minimum-role.guard.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { validateEnvironment } from './config/env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { DemoModule } from './demo/demo.module.js';
import { SucursalesModule } from './sucursales/sucursales.module.js';
import { CategoriasModule } from './categorias/categorias.module.js';
import { TallasModule } from './tallas/tallas.module.js';
import { ColoresModule } from './colores/colores.module.js';
import { ProductosModule } from './productos/productos.module.js';
import { InventarioModule } from './inventario/inventario.module.js';
import { VentasModule } from './ventas/ventas.module.js';
import { PagosModule } from './pagos/pagos.module.js';
import { CarritoModule } from './carrito/carrito.module.js';
import { ReportesModule } from './reportes/reportes.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    DemoModule,
    SucursalesModule,
    CategoriasModule,
    TallasModule,
    ColoresModule,
    ProductosModule,
    InventarioModule,
    VentasModule,
    PagosModule,
    CarritoModule,
    ReportesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: MinimumRoleGuard },
  ],
})
export class AppModule {}
