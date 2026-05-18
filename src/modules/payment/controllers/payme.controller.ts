import {
  Body,
  Controller,
  Header,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { PaymeErrorCodeEnum } from 'src/enums/payme-error-code.enum';
import { PaymeService } from '../services/payme.service';
import { PaymeRpcResponse } from '../types/payme.types';

/**
 * Payme Merchant API webhook receiver.
 *
 * URL: POST /api/payme/webhook
 *
 * Payme dashboard'ida URL'ga `/api/payme/webhook` qo'yiladi (production yoki
 * ngrok URL). Bu endpoint Payme tomonidan JSON-RPC so'rovlarni qabul qiladi:
 *   - CheckPerformTransaction
 *   - CreateTransaction
 *   - PerformTransaction
 *   - CancelTransaction
 *   - CheckTransaction
 *   - GetStatement
 *
 * Xavfsizlik:
 *   - Basic auth: header `Authorization: Basic <base64(Paycom:SECRET_KEY)>`
 *   - IP whitelist: faqat Payme rasmiy IP'lari (185.234.113.1-15)
 *     Override: PAYME_ALLOWED_IPS env (vergul orqali)
 *   - Timing-safe equal — timing attack'dan saqlanish
 *
 * Swagger'dan yashiriladi — bu Payme uchun ichki webhook.
 */
@ApiExcludeController()
@Controller('payme')
export class PaymeController {
  private static readonly DEFAULT_PAYME_ALLOWED_IPS: ReadonlyArray<string> = [
    '185.234.113.1',
    '185.234.113.2',
    '185.234.113.3',
    '185.234.113.4',
    '185.234.113.5',
    '185.234.113.6',
    '185.234.113.7',
    '185.234.113.8',
    '185.234.113.9',
    '185.234.113.10',
    '185.234.113.11',
    '185.234.113.12',
    '185.234.113.13',
    '185.234.113.14',
    '185.234.113.15',
  ];

  constructor(private readonly paymeService: PaymeService) {}

  @Post('webhook')
  @HttpCode(200)
  @Header('Content-Type', 'application/json')
  async handleWebhook(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Req() req?: Request,
  ): Promise<PaymeRpcResponse> {
    if (!this.isAuthorized(authorization) || !this.isAllowedIp(req)) {
      return {
        error: {
          code: PaymeErrorCodeEnum.INSUFFICIENT_PRIVILEGES,
          message: 'Insufficient privileges',
        },
        id: this.extractRpcId(body),
      };
    }

    return this.paymeService.handleRequest(body);
  }

  private isAuthorized(authorization?: string): boolean {
    const secretKey = process.env.PAYME_SECRET_KEY;
    if (!secretKey || !authorization) return false;

    const expected = `Basic ${Buffer.from(`Paycom:${secretKey}`).toString('base64')}`;
    const actualBuffer = Buffer.from(authorization);
    const expectedBuffer = Buffer.from(expected);

    if (actualBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(actualBuffer, expectedBuffer);
  }

  private isAllowedIp(req?: Request): boolean {
    // Test rejimi (PAYME_TEST_MODE=1) — IP tekshiruvi o'chiriladi, sandbox
    // va ngrok orqali test qilish uchun
    if (process.env.PAYME_TEST_MODE === '1') return true;

    const ip = this.resolveClientIp(req);
    if (!ip) return false;
    return this.getAllowedIps().has(ip);
  }

  private resolveClientIp(req?: Request): string | null {
    if (!req) return null;
    const forwardedFor = req.headers['x-forwarded-for'];
    const headerValue = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;
    const candidateFromHeader = headerValue?.split(',')[0]?.trim();
    const rawIp = candidateFromHeader || req.ip || req.socket?.remoteAddress;
    if (!rawIp) return null;
    return this.normalizeIp(rawIp);
  }

  private normalizeIp(ip: string): string {
    if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
    return ip;
  }

  private getAllowedIps(): Set<string> {
    const envIps = process.env.PAYME_ALLOWED_IPS;
    if (!envIps) {
      return new Set(PaymeController.DEFAULT_PAYME_ALLOWED_IPS);
    }
    const parsed = envIps
      .split(',')
      .map((ip) => this.normalizeIp(ip.trim()))
      .filter(Boolean);
    return new Set(parsed);
  }

  private extractRpcId(body: unknown): string | number | null {
    if (typeof body !== 'object' || body === null) return null;
    const candidate = (body as { id?: unknown }).id;
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      return candidate;
    }
    return null;
  }
}
