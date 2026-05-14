// libvips SIMD warninglarini yashirish (eski CPU'larda shovqin yaratadi)
process.env.VIPS_WARNING = '0';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { join } from 'path';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Class-validator errorlarini tekis (flat) ro'yxatga aylantiradi —
 * client tomonda ularni ko'rsatish oson.
 */
function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): Array<{ field: string; message: string }> {
  const result: Array<{ field: string; message: string }> = [];
  for (const err of errors) {
    const field = parent ? `${parent}.${err.property}` : err.property;
    if (err.constraints) {
      for (const msg of Object.values(err.constraints)) {
        result.push({ field, message: msg });
      }
    }
    if (err.children?.length) {
      result.push(...flattenValidationErrors(err.children, field));
    }
  }
  return result;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  app.enableCors({
    origin: [process.env.CLIENT_URL],
    credentials: true,
  });

  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      stopAtFirstError: false,
      exceptionFactory: (errors) => {
        const details = flattenValidationErrors(errors);
        return new BadRequestException({
          message:
            details[0]?.message ?? "Ma'lumotlarni to'g'ri kiritish kerak",
          errors: details,
        });
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Property API')
    .setDescription(
      'Amaar Property server API. User protected endpoints accept JWT through Authorization: Bearer token or the access_token cookie. Admin protected endpoints use Authorization: Bearer token. User refresh uses refresh_token cookie; admin refresh uses admin_refresh_token cookie.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'User/Admin JWT access token',
      },
      'bearer',
    )
    .addCookieAuth('access_token', {
      type: 'apiKey',
      in: 'cookie',
      description: 'JWT access token cookie',
    })
    .addCookieAuth('refresh_token', {
      type: 'apiKey',
      in: 'cookie',
      description: 'JWT refresh token cookie',
    })
    .addCookieAuth('admin_refresh_token', {
      type: 'apiKey',
      in: 'cookie',
      description: 'Admin JWT refresh token cookie',
    })
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      displayRequestDuration: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap()
  .then(() => {
    console.log('Tizim ishga tushdi');
  })
  .catch((error) => {
    console.error(error);
  });
