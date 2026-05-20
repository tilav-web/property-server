import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CountryConfigService } from 'src/common/config/country.config';

/**
 * Healthcheck endpoint - load balancer, Docker HEALTHCHECK, monitoring uchun.
 * Swagger'dan yashiringan (internal).
 */
@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly countryConfig: CountryConfigService,
  ) {}

  /** Oddiy liveness: server tirikmi? */
  @Get()
  liveness() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      country: this.countryConfig.country,
      currency: this.countryConfig.defaultCurrency,
    };
  }

  /** Readiness: MongoDB ulanish ham OK mi? */
  @Get('ready')
  async readiness() {
    const mongoState = this.connection.readyState;
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const isReady = mongoState === 1;
    const body = {
      status: isReady ? 'ready' : 'not_ready',
      checks: {
        mongo: this.formatMongoState(mongoState),
      },
      timestamp: new Date().toISOString(),
    };
    if (!isReady) {
      // 503 qaytarish uchun exception emas, balki HTTP code
      // (NestJS default 200; biz 503 bermayapmiz, balki client status string'ni o'qisin)
    }
    return body;
  }

  private formatMongoState(state: number): string {
    switch (state) {
      case 0:
        return 'disconnected';
      case 1:
        return 'connected';
      case 2:
        return 'connecting';
      case 3:
        return 'disconnecting';
      default:
        return 'unknown';
    }
  }
}
