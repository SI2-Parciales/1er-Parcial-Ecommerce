import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mkdir } from 'node:fs/promises';
import { AppModule } from './app.module.js';
import { resolveCorsOrigins } from './config/cors.config.js';
import type { AppEnvironment } from './config/env.validation.js';
import {
  PRODUCT_IMAGES_PUBLIC_PREFIX,
  resolveProductImagesDirectory,
} from './productos/product-images.constants.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<AppEnvironment>);
  app.enableCors({
    origin: resolveCorsOrigins(config.get<string>('CORS_ORIGINS')),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    maxAge: 86_400,
  });
  const productImagesDirectory = resolveProductImagesDirectory(
    config.get<string>('PRODUCT_IMAGES_DIR'),
  );
  await mkdir(productImagesDirectory, { recursive: true });
  app.useStaticAssets(productImagesDirectory, {
    prefix: PRODUCT_IMAGES_PUBLIC_PREFIX,
    dotfiles: 'deny',
    index: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('FashionStore API')
    .setDescription('Documentación de la API de FashionStore.')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearerAuth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'FashionStore API Docs',
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 1234);
}
await bootstrap();
