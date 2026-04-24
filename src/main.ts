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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap()
  .then(() => {
    console.log('Tizim ishga tushdi');
  })
  .catch((error) => {
    console.error(error);
  });
