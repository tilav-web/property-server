import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AdvertiseService } from './advertise.service';
import { CreateAdvertiseDto } from './dto/create-advertise.dto';
import { UpdateAdvertiseDto } from './dto/update-advertise.dto';

@Controller('advertise')
export class AdvertiseController {
  constructor(private readonly advertiseService: AdvertiseService) {}

  @Post()
  create(@Body() createAdvertiseDto: CreateAdvertiseDto) {
    return this.advertiseService.create(createAdvertiseDto);
  }

  @Get()
  findAll() {
    return this.advertiseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.advertiseService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAdvertiseDto: UpdateAdvertiseDto,
  ) {
    return this.advertiseService.update(id, updateAdvertiseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.advertiseService.remove(id);
  }
}
