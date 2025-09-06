import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global CORS (open in dev)
  app.enableCors({ origin: true, credentials: false });

  // Prefix API under /v1
  app.setGlobalPrefix('v1');

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle(process.env.APP_NAME || 'identity-entitlements-api')
    .setDescription('API for auth (Google) and entitlements')
    .setVersion('0.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT || 8787);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`identity-entitlements-api listening on :${port}`);
}

bootstrap();
