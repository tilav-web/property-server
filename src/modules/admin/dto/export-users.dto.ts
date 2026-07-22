import { PickType } from '@nestjs/swagger';
import { FindUsersDto } from './find-users.dto';

export class ExportUsersDto extends PickType(FindUsersDto, [
  'role',
  'search',
  'isPremium',
] as const) {}
