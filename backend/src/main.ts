import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';
import { getUploadRoot } from './common/upload';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', true);
  }

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*'
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const uploadRoot = getUploadRoot();
  fs.mkdirSync(uploadRoot, { recursive: true });
  app.useStaticAssets(uploadRoot, {
    prefix: '/uploads'
  });

  const config = new DocumentBuilder()
    .setTitle('Projeto Integrador - Backend')
    .setDescription('API do sistema web com autenticação JWT')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API disponível em http://localhost:${port}`);
}

bootstrap();
