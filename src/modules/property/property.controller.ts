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
  InternalServerErrorException,
  HttpException,
  Param,
  Res,
} from '@nestjs/common';
import { PropertyService, type FindAllParams } from './property.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreatePropertyDto } from './dto/create-property.dto';
import { AuthGuard } from '@nestjs/passport';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Property } from './property.schema';
import { File } from '../file/file.schema';
import { CreateMessageDto } from '../message/dto/create-message.dto';

@Controller('properties')
export class PropertyController {
  constructor(private readonly service: PropertyService) {}

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photos' },
      { name: 'video', maxCount: 1 },
      {
        name: 'contract_file',
        maxCount: 1,
      },
    ]),
  )
  async create(
    @UploadedFiles()
    files: {
      photos?: Express.Multer.File[];
      video?: Express.Multer.File[];
      contract_file?: Express.Multer.File[];
    },
    @Body() dto: CreatePropertyDto,
    @Req() req: IRequestCustom,
  ) {
    try {
      console.log(files.contract_file);

      const user = req.user;
      const newProperty = await this.service.createProperty({
        ...dto,
        author: user?._id as string,
        files,
      });
      return newProperty;
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Get()
  async findAll(@Query() query: FindAllParams, @Req() req: IRequestCustom) {
    try {
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
      const radius = query.radius
        ? parseInt(query.radius.toString(), 10)
        : 10000;
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
        purpose: query.purpose,
        search: query.search,
        price_type: query.price_type,
        construction_status: query.construction_status,
        is_premium: query.is_premium,
        is_verified: query.is_verified,
        is_new: query.is_new,
        is_guest_choice: query.is_guest_choice,
        rating,
        radius,
        sample: query.sample,
        userId: req.user?._id as string,
      });

      return result;
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Get('/share/:id')
  async share(@Param('id') id: string, @Res() res: Response) {
    try {
      const property = (await this.service.findById(id)) as Property & {
        photos?: File[];
      };

      const image = property?.photos?.[0]?.file_path || '';

      const html = `
    <!DOCTYPE html>
    <html lang="uz">
    <head>
      <meta charset="UTF-8" />
      <meta property="og:title" content="${property?.title.uz}" />
      <meta property="og:description" content="${property?.description.uz}" />
      <meta property="og:image" content="${image}" />
      <meta property="og:url" content="${process.env.CLIENT_URL}/property/${id}" />
      <meta name="twitter:card" content="summary_large_image" />
      <title>${property?.title.uz}</title>
      <script>
        window.location.href = "${process.env.CLIENT_URL}/property/${id}";
      </script>
    </head>
    <body>
      Redirecting...
    </body>
    </html>
  `;
      return res.send(html);
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Get('/my')
  @UseGuards(AuthGuard('jwt'))
  async findMyProperties(@Req() req: IRequestCustom) {
    try {
      const user = req.user;
      const result = await this.service.findMyProperties(user?._id as string);
      return result;
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    try {
      const result = await this.service.findById(id);
      return result;
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Post('/message')
  @UseGuards(AuthGuard('jwt'))
  async createMessage(
    @Body() dto: CreateMessageDto,
    @Req() req: IRequestCustom,
  ) {
    try {
      const user = req.user;
      const result = await this.service.createMessage({
        ...dto,
        user: user?._id as string,
      });
      return result;
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }
}
