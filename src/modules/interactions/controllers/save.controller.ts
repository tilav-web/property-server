import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';
import { SaveService } from '../services/save.service';
import { EnumLanguage } from 'src/enums/language.enum';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('bearer')
@ApiCookieAuth('access_token')
@ApiTags('Saves')
@ApiStandardErrors({ auth: true })
@Controller('saves')
export class SaveController {
  constructor(private readonly saveService: SaveService) {}

  @Post('/:propertyId')
  @ApiOperation({ summary: 'E’lonni saqlash / saqlangandan o‘chirish' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async saveProperty(
    @Param('propertyId') propertyId: string,
    @Req() req: IRequestCustom,
  ) {
    const userId = req.user?._id as string;
    const language = req.headers['accept-language'] as EnumLanguage;
    return this.saveService.saveProperty({ userId, propertyId, language });
  }

  @Get('/')
  @ApiOperation({ summary: 'Mening saqlanganlarim' })
  async findMySaves(@Req() req: IRequestCustom) {
    const userId = req.user?._id as string;
    return this.saveService.findMySaves(userId);
  }
}
