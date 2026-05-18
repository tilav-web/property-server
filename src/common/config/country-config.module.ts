import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CountryConfigService } from './country.config';

/**
 * Global module — har joyda inject qilinishi mumkin:
 *   constructor(private readonly countryConfig: CountryConfigService) {}
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [CountryConfigService],
  exports: [CountryConfigService],
})
export class CountryConfigModule {}
