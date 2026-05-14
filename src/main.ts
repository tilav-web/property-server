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
    customSiteTitle: 'Property API Docs',
    customCss: `
      .swagger-ui .topbar .download-openapi-json {
        align-items: center;
        background: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.7);
        border-radius: 4px;
        color: #173647;
        display: inline-flex;
        font-family: sans-serif;
        font-size: 14px;
        font-weight: 700;
        height: 34px;
        margin-left: 16px;
        padding: 0 12px;
        text-decoration: none;
      }
      .swagger-ui .topbar .download-openapi-json:hover {
        background: #e8f6ff;
      }
    `,
    customJsStr: `
      (function addDownloadOpenApiButton() {
        function addButton() {
          var topbar = document.querySelector('.swagger-ui .topbar .wrapper');
          if (!topbar || document.querySelector('.download-openapi-json')) {
            return;
          }

          var link = document.createElement('a');
          link.className = 'download-openapi-json';
          link.href = '/api/docs-json';
          link.download = 'property-api.openapi.json';
          link.textContent = 'Download OpenAPI JSON';
          topbar.appendChild(link);
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', addButton);
        } else {
          addButton();
        }

        setTimeout(addButton, 500);
      })();
    `,
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
