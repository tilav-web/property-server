import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';

@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  async list(
    @Req() req: IRequestCustom,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = String(req.user!._id);
    const parsedLimit = limit ? Number(limit) : 20;
    return this.service.findForUser(userId, {
      before,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 20,
    });
  }

  @Get('unread-count')
  async unreadCount(@Req() req: IRequestCustom) {
    const count = await this.service.unreadCount(String(req.user!._id));
    return { count };
  }

  @Patch('read-all')
  async markAllRead(@Req() req: IRequestCustom) {
    await this.service.markAllRead(String(req.user!._id));
    return { ok: true };
  }

  @Patch(':id/read')
  async markRead(@Req() req: IRequestCustom, @Param('id') id: string) {
    await this.service.markRead(String(req.user!._id), id);
    return { ok: true };
  }

  @Delete(':id')
  async remove(@Req() req: IRequestCustom, @Param('id') id: string) {
    await this.service.remove(String(req.user!._id), id);
    return { ok: true };
  }
}
