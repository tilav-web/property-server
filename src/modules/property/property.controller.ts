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
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
import { ApiMultipartBody } from 'src/common/swagger/file-upload.decorator';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';
import { OptionalJwtGuard } from '../push/guards/optional-jwt.guard';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Multer memory storage'da fayllar to'liq RAM'da saqlanadi — chegarasiz
// hajm bir nechta yirik video/rasm bilan serverni OOM qilishi mumkin.
const MAX_UPLOAD_FILE_SIZE = 100 * 1024 * 1024; // 100MB / fayl

@ApiTags('Properties')
@Controller('properties')
export class PropertyController {
  constructor(
    private readonly service: PropertyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photos', maxCount: 45 },
        { name: 'videos', maxCount: 2 },
      ],
      { limits: { fileSize: MAX_UPLOAD_FILE_SIZE } },
    ),
  )
  @ApiOperation({ summary: 'Create property' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiStandardErrors({ auth: true, validation: true })
  @ApiMultipartBody(CreatePropertyDto, [
    { name: 'photos', isArray: true },
    { name: 'videos', isArray: true },
  ])
  create(
    @Body() dto: CreatePropertyDto,
    @UploadedFiles()
    files: { photos?: Express.Multer.File[]; videos?: Express.Multer.File[] },
    @Req() req: IRequestCustom,
  ) {
    return this.service.create({ dto, files, author: req.user?._id });
  }

  // Eng ko'p urib turadigan public endpoint: kategoriya/filtr almashtirish,
  // pagination, sort — hammasi shu route'ga tushadi. Global default'dan
  // (120/60s) PASTROQ qo'yish bu yerda aynan zid natija beradi — foydalanuvchi
  // bir necha marta kategoriya bosganda tezda 429 ko'radi. Global default'dan
  // sezilarli yuqori qo'yamiz, chunki bu faqat o'qish (GET) va OpenAI kabi
  // xarajat talab qilmaydi.
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  @Get()
  @ApiOperation({ summary: 'E’lonlar bo‘yicha qidiruv (public)' })
  @ApiStandardErrors({ validation: true, throttle: true })
  findAll(@Query() query: FindAllPropertiesDto, @Req() req: IRequestCustom) {
    const raw = req.headers['accept-language'] ?? '';
    const first = raw.split(',')[0]?.trim().toLowerCase();
    const language = (Object.values(EnumLanguage) as string[]).includes(first)
      ? (first as EnumLanguage)
      : EnumLanguage.EN;

    return this.service.findAll({ ...query, language });
  }

  @Get('share/:id')
  @ApiOperation({ summary: 'Sharing uchun OG meta sahifa (HTML)' })
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
  @ApiOperation({ summary: 'Joriy foydalanuvchi e’lonlari' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiStandardErrors({ auth: true })
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
    FileFieldsInterceptor(
      [
        { name: 'new_photos', maxCount: 25 },
        { name: 'new_videos', maxCount: 2 },
      ],
      { limits: { fileSize: MAX_UPLOAD_FILE_SIZE } },
    ),
  )
  @ApiOperation({ summary: 'Update property' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiStandardErrors({
    auth: true,
    forbidden: true,
    notFound: true,
    validation: true,
  })
  @ApiMultipartBody(UpdatePropertyDto, [
    { name: 'new_photos', isArray: true },
    { name: 'new_videos', isArray: true },
  ])
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
  @ApiOperation({ summary: 'E’lonni o‘chirish' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiStandardErrors({ auth: true, forbidden: true, notFound: true })
  async deleteById(@Param('id') id: string, @Req() req: IRequestCustom) {
    const user = req.user;
    if (!user) {
      throw new HttpException('Unauthorized', 401);
    }
    return this.service.remove({ id, userId: user._id });
  }

  @Put(':id/status')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'E’lon statusini admin tomonidan o‘zgartirish' })
  @ApiBearerAuth('bearer')
  @ApiStandardErrors({
    auth: true,
    forbidden: true,
    notFound: true,
    validation: true,
  })
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePropertyStatusDto) {
    return this.service.updateStatus({
      id,
      status: dto.status,
      note: dto.note,
    });
  }

  @Post('/message')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'E’lon egasi bilan xabar yuborish' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiStandardErrors({ auth: true, validation: true, notFound: true })
  async sendMessage(@Body() dto: CreateMessageDto, @Req() req: IRequestCustom) {
    const user = req.user;
    return this.service.sendMessage({
      dto,
      user: user?._id as string,
    });
  }

  @Put(':id/archive')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'E’lonni arxivga olish / arxivdan chiqarish' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiStandardErrors({ auth: true, forbidden: true, notFound: true })
  toggleArchive(@Param('id') id: string, @Req() req: IRequestCustom) {
    return this.service.toggleArchive({ id, userId: req.user?._id as string });
  }

  @Get('/categories/list')
  @ApiOperation({ summary: 'Kategoriya turlari ro‘yxati' })
  async getCategories() {
    return this.service.getCategories();
  }

  @Get('/stats/transactions')
  @ApiOperation({ summary: 'Transaction statistikasi' })
  async getTransactionStats() {
    return this.service.getTransactionStats();
  }

  @Get('/update/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update sahifasi uchun e’lon (faqat ega)' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiStandardErrors({ auth: true, forbidden: true, notFound: true })
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
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'E’lon tafsiloti (id bo‘yicha)' })
  @ApiStandardErrors({ notFound: true })
  async findById(@Param('id') id: string, @Req() req: IRequestCustom) {
    const language = req.headers['accept-language'] as EnumLanguage;
    const userId = req.user?._id;
    const result = await this.service.findById({ id, language, userId });

    this.eventEmitter.emit('property.viewed', {
      propertyId: id,
      userId: userId?.toString(),
      ip: req.ip ?? (req.socket as any)?.remoteAddress,
    });

    return result;
  }
}
