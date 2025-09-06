import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global CORS (open in dev)
  app.enableCors({ origin: true, credentials: false });

  // Global validation, filters, interceptors
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

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
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/docs-json', (req: any, res: any) => {
    res.json(document);
  });

  const port = Number(process.env.PORT || 8787);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`identity-entitlements-api listening on :${port}`);
}

bootstrap();
