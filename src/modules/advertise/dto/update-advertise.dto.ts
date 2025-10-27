import { PartialType } from '@nestjs/mapped-types';
import { CreateAdvertiseDto } from './create-advertise.dto';

export class UpdateAdvertiseDto extends PartialType(CreateAdvertiseDto) {}
