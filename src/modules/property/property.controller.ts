import {
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  Put,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Delete,
  Res,
} from '@nestjs/common';
import { PropertyService } from './property.service';
import { FindAllPropertiesDto } from './dto/find-all-properties.dto';
import { EnumLanguage } from 'src/enums/language.enum';
import { AuthGuard } from '@nestjs/passport';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';
import { UpdatePropertyStatusDto } from './dto/update-property-status.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { CreatePropertyDto } from './dto/create-property.dto';
import { CreateMessageDto } from '../message/dto/create-message.dto';
import { FilterMyPropertiesDto } from './dto/filter-my-properties.dto';
import { type Response } from 'express';

@Controller('properties')
export class PropertyController {
  constructor(private readonly service: PropertyService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photos', maxCount: 25 },
      { name: 'videos', maxCount: 2 },
    ]),
  )
  create(
    @Body() dto: CreatePropertyDto,
    @UploadedFiles()
    files: { photos?: Express.Multer.File[]; videos?: Express.Multer.File[] },
    @Req() req: IRequestCustom,
  ) {
    return this.service.create({ dto, files, author: req.user?._id });
  }

  @Get()
  findAll(@Query() query: FindAllPropertiesDto, @Req() req: IRequestCustom) {
    const language = req.headers['accept-language'] as EnumLanguage;

    const rawQuery = (req.query ?? {}) as Record<string, unknown>;

    const normalizeArrayParam = (key: string): number[] | undefined => {
      const maybe = rawQuery[key] ?? rawQuery[`${key}[]`];
      if (maybe === undefined || maybe === null || maybe === '')
        return undefined;

      if (Array.isArray(maybe)) {
        return maybe
          .map((x) => {
            if (typeof x === 'string' || typeof x === 'number')
              return Number(x);
            return NaN;
          })
          .filter((n) => !Number.isNaN(n));
      }

      if (typeof maybe === 'string') {
        const s = maybe.trim();
        if (s === '') return undefined;

        if (s.startsWith('[') && s.endsWith(']')) {
          try {
            const parsed: unknown = JSON.parse(s);
            if (Array.isArray(parsed)) {
              return (parsed as unknown[])
                .filter((v) => typeof v === 'string' || typeof v === 'number')
                .map((v) => Number(v))
                .filter((n) => !Number.isNaN(n));
            }
          } catch (e) {
            console.error(e);
          }
        }

        if (s.includes(',')) {
          return s
            .split(',')
            .map((x) => Number(x.trim()))
            .filter((n) => !Number.isNaN(n));
        }

        const num = Number(s);
        return Number.isNaN(num) ? undefined : [num];
      }

      if (typeof maybe === 'number') return [maybe];

      return undefined;
    };

    const normalized = { ...query } as FindAllPropertiesDto;
    if (!normalized.bedrooms)
      normalized.bedrooms = normalizeArrayParam('bedrooms');
    if (!normalized.bathrooms)
      normalized.bathrooms = normalizeArrayParam('bathrooms');

    return this.service.findAll({ ...normalized, language });
  }

  @Get('share/:id')
  async shareProperty(
    @Param('id') id: string,
    @Req() req: IRequestCustom,
    @Res() res: Response,
  ) {
    const language =
      (req.headers['accept-language'] as EnumLanguage) ?? EnumLanguage.UZ;

    const property = await this.service.findById({ id, language });

    if (!property) {
      return res.status(404).send('Property not found');
    }

    const frontendUrl = `${process.env.CLIENT_URL}/property/${id}`;

    const html = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8" />

  <title>${property.title}</title>
  <meta name="description" content="${property.description ?? ''}" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${property.title}" />
  <meta property="og:description" content="${property.description ?? ''}" />
  <meta property="og:image" content="${property.photos[0]}" />
  <meta property="og:url" content="${frontendUrl}" />
  <meta property="telegram:channel" content="@Tilav_web" />
  <meta name="twitter:card" content="summary" />

  <script>
    setTimeout(() => {
      window.location.href = "${frontendUrl}";
    }, 300);
  </script>
</head>
<body>
  <p>Loading...</p>
</body>
</html>
`;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }

  @Get('/my')
  @UseGuards(AuthGuard('jwt'))
  async findMyProperties(
    @Req() req: IRequestCustom,
    @Query() filter: FilterMyPropertiesDto,
  ) {
    const language = (req.headers['accept-language'] || 'uz')
      .toLowerCase()
      .split(',')[0] as EnumLanguage;
    const result = await this.service.findMyProperties({
      author: req.user?._id as string,
      ...filter,
      language,
    });
    return result;
  }

  @Delete('/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteById(@Param('id') id: string, @Req() req: IRequestCustom) {
    try {
      const user = req.user;
      if (!user) {
        throw new HttpException('Unauthorized', 401);
      }
      const result = await this.service.remove({
        id,
        userId: user._id,
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

  @Get(':id')
  findById(@Param('id') id: string, @Req() req: IRequestCustom) {
    const language = req.headers['accept-language'] as EnumLanguage;
    return this.service.findById({ id, language });
  }

  @Put(':id/status')
  @UseGuards(AuthGuard('jwt'))
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePropertyStatusDto) {
    // The service method already checks for ADMIN role
    return this.service.updateStatus({
      id,
      status: dto.status,
    });
  }

  @Post('/message')
  @UseGuards(AuthGuard('jwt'))
  async sendMessage(@Body() dto: CreateMessageDto, @Req() req: IRequestCustom) {
    try {
      const user = req.user;
      const result = await this.service.sendMessage({
        dto,
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

  @Put(':id/archive')
  @UseGuards(AuthGuard('jwt'))
  toggleArchive(@Param('id') id: string, @Req() req: IRequestCustom) {
    // The service method checks for ownership
    return this.service.toggleArchive({ id, userId: req.user?._id as string });
  }

  @Get('/categories/list')
  async getCategories() {
    return this.service.getCategories();
  }
}
