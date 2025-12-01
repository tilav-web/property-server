import { PartialType } from '@nestjs/mapped-types';
import { CreatePropertyBaseDto } from './create-property.dto';

export class UpdatePropertyDto extends PartialType(CreatePropertyBaseDto) {}
