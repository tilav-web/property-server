import { Module, OnApplicationBootstrap, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommunityService } from './community.service';
import { CommunityFilterService } from './community-filter.service';
import { CommunityController } from './community.controller';
import {
  Community,
  CommunitySchema,
} from './schemas/community.schema';
import {
  CommunityFilter,
  CommunityFilterSchema,
} from './schemas/community-filter.schema';
import { FileModule } from '../file/file.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Community.name, schema: CommunitySchema },
      { name: CommunityFilter.name, schema: CommunityFilterSchema },
    ]),
    FileModule,
    forwardRef(() => AdminModule),
  ],
  controllers: [CommunityController],
  providers: [CommunityService, CommunityFilterService],
  exports: [CommunityService, CommunityFilterService],
})
export class CommunityModule implements OnApplicationBootstrap {
  constructor(
    private readonly filters: CommunityFilterService,
    private readonly communities: CommunityService,
  ) {}

  async onApplicationBootstrap() {
    // 1) Filterlarni seed qilish (mavjud bo'lmaganlarini qo'shamiz)
    const seedFilters = [
      { key: 'popular', name: 'Mashhur', icon: 'Award', order: 1 },
      { key: 'budget', name: 'Arzon', icon: 'Wallet', order: 2 },
      { key: 'business', name: 'Biznes uchun', icon: 'Briefcase', order: 3 },
      { key: 'eco', name: 'Ekologik toza', icon: 'Leaf', order: 4 },
      { key: 'expats', name: 'Chet ellik', icon: 'Plane', order: 5 },
      { key: 'family', name: 'Oilaviy', icon: 'Users', order: 6 },
      { key: 'green', name: 'Yashil hududlar', icon: 'TreePine', order: 7 },
    ];
    await this.filters.ensureSeed(seedFilters);

    // 2) Communities seed (faqat agar DB bo'sh bo'lsa)
    const allFilters = await this.filters.findAll();
    const byKey = new Map(allFilters.map((f) => [f.key, String(f._id)]));

    const seedCommunities = [
      { name: 'Qarshi markaz', rating: 4.6, filterKey: 'popular', order: 1 },
      { name: 'Yangi Qarshi', rating: 4.5, filterKey: 'popular', order: 2 },
      { name: 'Cosmos rayoni', rating: 4.4, filterKey: 'popular', order: 3 },
      { name: 'Shahrisabz', rating: 4.7, filterKey: 'popular', order: 4 },
      { name: 'Kitob', rating: 4.2, filterKey: 'popular', order: 5 },
      { name: "Yakkabog'", rating: 4.1, filterKey: 'popular', order: 6 },
      { name: "G'uzor", rating: 4.0, filterKey: 'budget', order: 1 },
      { name: 'Qamashi', rating: 3.9, filterKey: 'budget', order: 2 },
      { name: 'Koson', rating: 4.1, filterKey: 'budget', order: 3 },
      { name: 'Chiroqchi', rating: 3.8, filterKey: 'budget', order: 4 },
    ];

    const filtered = seedCommunities
      .filter((s) => byKey.has(s.filterKey))
      .map((s) => ({
        ...s,
        filterId: byKey.get(s.filterKey)!,
      }));

    await this.communities.ensureSeed(filtered);
  }
}
