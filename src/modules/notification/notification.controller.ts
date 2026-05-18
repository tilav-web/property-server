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
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('bearer')
@ApiCookieAuth('access_token')
@ApiTags('Notifications')
@ApiStandardErrors({ auth: true })
@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Notification’lar (paginatsiya: before+limit)' })
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
  @ApiOperation({ summary: 'O‘qilmagan notification’lar soni' })
  async unreadCount(@Req() req: IRequestCustom) {
    const count = await this.service.unreadCount(String(req.user!._id));
    return { count };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Hammasini o‘qilgan deb belgilash' })
  async markAllRead(@Req() req: IRequestCustom) {
    await this.service.markAllRead(String(req.user!._id));
    return { ok: true };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Notification’ni o‘qilgan deb belgilash' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async markRead(@Req() req: IRequestCustom, @Param('id') id: string) {
    await this.service.markRead(String(req.user!._id), id);
    return { ok: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Notification’ni o‘chirish' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async remove(@Req() req: IRequestCustom, @Param('id') id: string) {
    await this.service.remove(String(req.user!._id), id);
    return { ok: true };
  }
}
