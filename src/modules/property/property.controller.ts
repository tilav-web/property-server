import {
  Body,
  Controller,
  Get,
  HttpException,
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
  Patch,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PropertyService } from './property.service';
import { FindAllPropertiesDto } from './dto/find-all-properties.dto';
import { EnumLanguage } from 'src/enums/language.enum';
import { AuthGuard } from '@nestjs/passport';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';
import { UpdatePropertyStatusDto } from './dto/update-property-status.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreatePropertyDto } from './dto/create-property.dto';
import { CreateMessageDto } from '../message/dto/create-message.dto';
import { FilterMyPropertiesDto } from './dto/filter-my-properties.dto';
import { type Response } from 'express';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { AdminGuard } from '../admin/guards/admin.guard';

@Controller('properties')
export class PropertyController {
  constructor(private readonly service: PropertyService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photos', maxCount: 45 },
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

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get()
  findAll(@Query() query: FindAllPropertiesDto, @Req() req: IRequestCustom) {
    const raw = (req.headers['accept-language'] as string | undefined) ?? '';
    const first = raw.split(',')[0]?.trim().toLowerCase();
    const language = (Object.values(EnumLanguage) as string[]).includes(first)
      ? (first as EnumLanguage)
      : EnumLanguage.EN;

    return this.service.findAll({ ...query, language });
  }

  @Get('share/:id')
  async shareProperty(
    @Param('id') id: string,
    @Req() req: IRequestCustom,
    @Res() res: Response,
  ) {
    const language =
      (req.headers['accept-language'] as EnumLanguage) ?? EnumLanguage.EN;

    const property = await this.service.findById({ id, language });

    if (!property) {
      return res.status(404).send('Property not found');
    }

    const frontendUrl = `${process.env.CLIENT_URL}/property/${id}`;
    const fallbackImage = `${process.env.CLIENT_URL}/images/hero/home-hero-800.webp`;
    const shareImage = property.photos?.[0] || fallbackImage;

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
  <meta property="og:image" content="${shareImage}" />
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
    const language = (req.headers['accept-language'] || 'en')
      .toLowerCase()
      .split(',')[0] as EnumLanguage;
    const result = await this.service.findMyProperties({
      author: req.user?._id as string,
      ...filter,
      language,
    });
    return result;
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'new_photos', maxCount: 25 },
      { name: 'new_videos', maxCount: 2 },
    ]),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @UploadedFiles()
    files: {
      new_photos?: Express.Multer.File[];
      new_videos?: Express.Multer.File[];
    },
    @Req() req: IRequestCustom,
  ) {
    const user = req.user;
    if (!user) {
      throw new HttpException('Unauthorized', 401);
    }
    return this.service.update({
      id,
      userId: user._id,
      dto,
      files,
    });
  }

  @Delete('/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteById(@Param('id') id: string, @Req() req: IRequestCustom) {
    const user = req.user;
    if (!user) {
      throw new HttpException('Unauthorized', 401);
    }
    return this.service.remove({ id, userId: user._id });
  }

  @Put(':id/status')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePropertyStatusDto) {
    return this.service.updateStatus({
      id,
      status: dto.status,
    });
  }

  @Post('/message')
  @UseGuards(AuthGuard('jwt'))
  async sendMessage(@Body() dto: CreateMessageDto, @Req() req: IRequestCustom) {
    const user = req.user;
    return this.service.sendMessage({
      dto,
      user: user?._id as string,
    });
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

  @Get('/stats/transactions')
  async getTransactionStats() {
    return this.service.getTransactionStats();
  }

  @Get('/update/:id')
  @UseGuards(AuthGuard('jwt'))
  async findOnePropertyForUpdate(
    @Param('id') id: string,
    @Req() req: IRequestCustom,
  ) {
    const user = req.user;
    if (!user) {
      throw new HttpException('Unauthorized', 401);
    }
    return this.service.findOnePropertyForUpdate({
      propertyId: id,
      authorId: user._id,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string, @Req() req: IRequestCustom) {
    const language = req.headers['accept-language'] as EnumLanguage;
    const userId = req.user?._id as string | undefined;
    return this.service.findById({ id, language, userId });
  }
}
