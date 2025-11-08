import { Injectable } from '@nestjs/common';
import { PropertyService } from '../property/property.service';
import { AdvertiseService } from '../advertise/advertise.service';
import { EnumAdvertiseType } from 'src/enums/advertise-type.enum';
import { EnumPropertyCategory } from 'src/enums/property-category.enum';
import { EnumPropertyPriceType } from 'src/enums/property-price-type.enum';
import { EnumPropertyPurpose } from 'src/enums/property-purpose.enum';

@Injectable()
export class LayoutService {
  constructor(
    private readonly propertyService: PropertyService,
    private readonly advertiseService: AdvertiseService,
  ) {}

  async getMainPageLayout(category?: EnumPropertyCategory) {
    const [propertiesResult, asideAds, bannerAds] = await Promise.all([
      this.propertyService.findAll({ limit: 6, sample: true, category }),
      this.advertiseService.findAll({
        limit: 2,
        type: EnumAdvertiseType.ASIDE,
        sample: true,
      }),
      this.advertiseService.findAll({
        limit: 2,
        type: EnumAdvertiseType.BANNER,
        sample: true,
      }),
    ]);

    return {
      properties: propertiesResult.properties,
      asideAds,
      bannerAds,
    };
  }

  async getCategoryPageLayout(params: {
    category?: EnumPropertyCategory;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 6, category } = params;

    const [propertiesResult, imageAd, bannerAd] = await Promise.all([
      this.propertyService.findAll({
        limit,
        page,
        category,
        sample: false, // Properties are not random
      }),
      this.advertiseService.findAll({
        limit: 1,
        type: EnumAdvertiseType.IMAGE,
        sample: true, // Ads are random
      }),
      this.advertiseService.findAll({
        limit: 1,
        type: EnumAdvertiseType.BANNER,
        sample: true, // Ads are random
      }),
    ]);

    return {
      properties: propertiesResult.properties,
      pagination: propertiesResult.pagination,
      imageAd: imageAd?.[0] || null,
      bannerAd: bannerAd?.[0] || null,
    };
  }

  async getFilterNavLayout(params: {
    purpose?: EnumPropertyPurpose;
    category?: EnumPropertyCategory;
    price_type?: EnumPropertyPriceType;
  }) {
    const [propertiesResult, imageAds, bannerAds] = await Promise.all([
      this.propertyService.findAll({
        limit: 12,
        sample: true,
        ...params,
      }),
      this.advertiseService.findAll({
        limit: 2,
        type: EnumAdvertiseType.IMAGE,
        sample: true,
      }),
      this.advertiseService.findAll({
        limit: 2,
        type: EnumAdvertiseType.BANNER,
        sample: true,
      }),
    ]);

    return {
      properties: propertiesResult.properties,
      imageAds,
      bannerAds,
    };
  }
}
