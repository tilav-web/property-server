import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { PropertyService, type FindAllParams } from './property.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreatePropertyDto } from './dto/create-property.dto';
import { AuthGuard } from '@nestjs/passport';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';

@Controller('properties')
export class PropertyController {
  constructor(private readonly service: PropertyService) {}

  @Post('/')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'banner', maxCount: 1 },
      { name: 'photos', maxCount: 5 },
      { name: 'videos', maxCount: 5 },
    ]),
  )
  async create(
    @UploadedFiles()
    files: {
      banner?: Express.Multer.File[];
      photos?: Express.Multer.File[];
      videos?: Express.Multer.File[];
    },
    @Body() dto: CreatePropertyDto,
    @Req() req: IRequestCustom,
  ) {
    const user = req.user;
    const newProperty = await this.service.createProperty({
      ...dto,
      author: user?._id as string,
      files,
    });
    return newProperty;
  }

  @Get()
  async findAll(@Query() query: FindAllParams) {
    let coordinates: [number, number] | undefined;
    if (query.coordinates) {
      let coords: any = query.coordinates;

      // Agar string bo'lsa (masalan: "69.24,41.29")
      if (typeof coords === 'string') {
        coords = coords.split(',').map((c: string) => parseFloat(c.trim()));
      }

      // Agar string massiv bo'lsa (masalan: ["69.24", "41.29"])
      if (Array.isArray(coords)) {
        coords = coords.map((c: any) => parseFloat(c));
      }

      if (
        Array.isArray(coords) &&
        coords.length === 2 &&
        !isNaN(coords[0]) &&
        !isNaN(coords[1])
      ) {
        // Har doim GeoJSON formati: [lon, lat]
        coordinates = [coords[0], coords[1]] as [number, number];
      }
    }

    const page = query.page ? parseInt(query.page.toString(), 10) : 1;
    const limit = query.limit ? parseInt(query.limit.toString(), 10) : 20;
    const radius = query.radius ? parseInt(query.radius.toString(), 10) : 10000;
    const rating = query.rating
      ? parseFloat(query.rating.toString())
      : undefined;

    const result = await this.service.findAll({
      page,
      limit,
      region: query.region,
      district: query.district,
      coordinates,
      category: query.category,
      search: query.search,
      price_type: query.price_type,
      construction_status: query.construction_status,
      is_premium: query.is_premium,
      is_verified: query.is_verified,
      is_new: query.is_new,
      is_guest_choice: query.is_guest_choice,
      rating,
      radius,
    });

    return result;
  }
}
