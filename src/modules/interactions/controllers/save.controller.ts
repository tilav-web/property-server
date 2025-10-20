import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';
import { SaveService } from '../services/save.service';

@Controller('saves')
export class SaveController {
  constructor(private readonly saveService: SaveService) {}

  @Post('/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  async saveProperty(
    @Param('propertyId') propertyId: string,
    @Req() req: IRequestCustom,
  ) {
    const userId = req.user?._id as string;
    return this.saveService.saveProperty(userId, propertyId);
  }

  @Get('/')
  @UseGuards(AuthGuard('jwt'))
  async getSavedProperties(@Req() req: IRequestCustom) {
    const userId = req.user?._id as string;
    return this.saveService.getSavedProperties(userId);
  }
}
