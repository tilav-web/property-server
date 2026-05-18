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
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../admin/guards/admin.guard';
import { type IAdminRequestCustom } from 'src/interfaces/admin-request.interface';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';
import { NotificationService } from './notification.service';

/**
 * Admin uchun notification endpoints. User'lar uchun NotificationController
 * (/notifications) qoldi — bir-biriga aralashmaydi (recipientType filter).
 *
 * Asosiy use case: yangi to'lov SUCCESS bo'lganda barcha admin'larga
 * notification yuboriladi (PAYMENT_AWAITING_APPROVAL).
 */
@UseGuards(AdminGuard)
@ApiBearerAuth('bearer')
@ApiTags('Admin Notifications')
@ApiStandardErrors({ auth: true })
@Controller('admins/notifications')
export class AdminNotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin notification ro‘yxati (paginatsiya: before+limit)',
  })
  async list(
    @Req() req: IAdminRequestCustom,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    const adminId = String(req.admin?._id);
    const parsedLimit = limit ? Number(limit) : 20;
    return this.service.findForAdmin(adminId, {
      before,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 20,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'O‘qilmagan notification‘lar soni' })
  async unreadCount(@Req() req: IAdminRequestCustom) {
    const count = await this.service.unreadCountForAdmin(
      String(req.admin?._id),
    );
    return { count };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Hammasini o‘qilgan deb belgilash' })
  async markAllRead(@Req() req: IAdminRequestCustom) {
    await this.service.markAllReadForAdmin(String(req.admin?._id));
    return { ok: true };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Notification‘ni o‘qilgan deb belgilash' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async markRead(
    @Req() req: IAdminRequestCustom,
    @Param('id') id: string,
  ) {
    await this.service.markReadForAdmin(String(req.admin?._id), id);
    return { ok: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Notification‘ni o‘chirish' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async remove(
    @Req() req: IAdminRequestCustom,
    @Param('id') id: string,
  ) {
    await this.service.removeForAdmin(String(req.admin?._id), id);
    return { ok: true };
  }
}
