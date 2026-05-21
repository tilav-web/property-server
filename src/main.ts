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

  // Nginx orqasida ishlaymiz -> Express'ga "trust proxy" bering, aks holda
  // req.ip har doim 127.0.0.1 bo'lib qoladi (nginx IP) va anonim user'lar
  // bir xil counter'ni baham ko'rishadi. Trust=1 bitta proxy hop'ga ishonadi.
  const expressApp = app.getHttpAdapter().getInstance() as express.Express;
  expressApp.set('trust proxy', 1);

  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  const clientOrigins = (process.env.CLIENT_URL ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: clientOrigins.length > 0 ? clientOrigins : true,
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
      [
        'Amaar Property server API.',
        '',
        '**Autentifikatsiya (User):** himoyalangan endpointlar ikkala usulni ham qabul qiladi:',
        '- `Authorization: Bearer <access_token>` headeri',
        "- yoki `access_token` cookie'si (web SPA uchun)",
        '',
        '**Autentifikatsiya (Admin):** faqat `Authorization: Bearer <admin_access_token>` headeri.',
        '',
        '**Refresh:** user uchun `refresh_token` cookie, admin uchun `admin_refresh_token` cookie.',
        '',
        "**Swagger'da login qilish:**",
        '1. `/users/auth/login` (yoki `/admins/login`) endpointini chaqiring.',
        "2. Response body'dan `access_token` (yoki `admin_access_token`) qiymatini nusxa oling.",
        "3. Yuqori-o'ngdagi **Authorize** tugmasini bosing va `bearer` field'iga tokenni qo'ying.",
        "> Bu sahifa maxsus skript bilan jihozlangan — login muvaffaqiyatli bo'lganda token avtomatik **Authorize** field'iga qo'yiladi.",
        '',
        "**Error format:** barcha xatoliklar `{ statusCode, message, code?, errors? }` ko'rinishida qaytadi.",
        "`code` mashinada o'qiladigan sabab (masalan: `token_expired`, `token_invalid`, `token_missing`, `user_not_found`, `validation_error`, `duplicate_key`, `not_found`).",
      ].join('\n'),
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

      // Login responsedan access_tokenni avtomatik olib, Swaggerning
      // "Authorize" formidagi bearer fieldiga qoyadi. Foydalanuvchi qolda
      // nusxa olishi shart emas.
      //
      // Aniqlangan login endpointlari:
      //   POST /users/auth/login, /users/auth/confirm-otp
      //   POST /admins/login
      //   POST /users/auth/refresh-token, /admins/refresh-token
      (function autoFillBearerFromLogin() {
        var LOGIN_PATHS = [
          '/users/auth/login',
          '/users/auth/confirm-otp',
          '/users/auth/refresh-token',
          '/admins/login',
          '/admins/refresh-token',
        ];

        function isLoginUrl(url) {
          if (!url) return false;
          try {
            var path = new URL(url, window.location.origin).pathname;
            return LOGIN_PATHS.some(function (p) { return path.endsWith(p); });
          } catch (_e) {
            return false;
          }
        }

        function pickToken(payload) {
          if (!payload || typeof payload !== 'object') {
            if (typeof payload === 'string' && payload.split('.').length === 3) {
              return payload; // raw JWT
            }
            return null;
          }
          return (
            payload.access_token ||
            payload.admin_access_token ||
            (payload.data && (payload.data.access_token || payload.data.admin_access_token)) ||
            null
          );
        }

        function persistAuth(token) {
          try {
            var key = 'authorized';
            var existing = JSON.parse(window.localStorage.getItem(key) || '{}');
            existing.bearer = {
              name: 'bearer',
              schema: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
              value: token,
            };
            window.localStorage.setItem(key, JSON.stringify(existing));
          } catch (_e) {}

          if (window.ui && typeof window.ui.authActions !== 'undefined') {
            try {
              window.ui.authActions.authorize({
                bearer: {
                  name: 'bearer',
                  schema: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                  value: token,
                },
              });
            } catch (_e) {}
          }
        }

        function notify(message) {
          var existing = document.querySelector('.bearer-autofill-toast');
          if (existing) existing.remove();
          var toast = document.createElement('div');
          toast.className = 'bearer-autofill-toast';
          toast.textContent = message;
          toast.style.cssText =
            'position:fixed;bottom:24px;right:24px;background:#173647;color:#fff;' +
            'padding:10px 14px;border-radius:6px;font-family:sans-serif;font-size:13px;' +
            'box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:9999;';
          document.body.appendChild(toast);
          setTimeout(function () { toast.remove(); }, 3000);
        }

        var origFetch = window.fetch;
        window.fetch = function (input, init) {
          var url = typeof input === 'string' ? input : (input && input.url);
          var promise = origFetch.apply(this, arguments);
          if (!isLoginUrl(url)) return promise;
          return promise.then(function (response) {
            try {
              var clone = response.clone();
              clone.json().then(function (data) {
                var token = pickToken(data);
                if (token) {
                  persistAuth(token);
                  notify('access_token aniqlandi va Authorize formiga qoyildi');
                }
              }).catch(function () {});
            } catch (_e) {}
            return response;
          });
        };
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
