import { PartialType } from '@nestjs/swagger';
import { CreateCommunityFilterDto } from './create-community-filter.dto';

export class UpdateCommunityFilterDto extends PartialType(
  CreateCommunityFilterDto,
) {}
