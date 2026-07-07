import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminGuard } from '../admin/guards/admin.guard';
import { FcmService } from './fcm.service';
import { PushTokenService } from './push-token.service';
import { FileService } from '../file/file.service';
import { SendBroadcastDto } from './dto/send-broadcast.dto';
import {
  BroadcastNotification,
  BroadcastNotificationDocument,
  BroadcastTargetGroup,
} from './schemas/broadcast-notification.schema';
import type { IAdminRequestCustom } from '../../interfaces/admin-request.interface';

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

@UseGuards(AdminGuard)
@Controller('admins/push-notifications')
export class AdminPushController {
  constructor(
    private readonly fcmService: FcmService,
    private readonly pushTokenService: PushTokenService,
    private readonly fileService: FileService,
    @InjectModel(BroadcastNotification.name)
    private readonly broadcastModel: Model<BroadcastNotificationDocument>,
  ) {}

  /** Push notification uchun rasm yuklash. */
  @Post('image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImage(@UploadedFile() image: Express.Multer.File) {
    const url = await this.fileService.saveFile({ file: image, folder: 'photos' });
    return { url };
  }

  /** Broadcast push notification yuboradi. */
  @Post()
  @HttpCode(HttpStatus.OK)
  async send(
    @Body() dto: SendBroadcastDto,
    @Req() req: IAdminRequestCustom,
  ) {
    const targetGroup = dto.targetGroup ?? BroadcastTargetGroup.ALL;

    const tokens =
      targetGroup === BroadcastTargetGroup.PREMIUM
        ? await this.pushTokenService.findPremiumUserTokens()
        : await this.pushTokenService.findAllUserTokens();

    const plainBody = stripHtml(dto.body);

    const sentCount = await this.fcmService.sendToTokens(tokens, {
      title: dto.title,
      body: plainBody,
      imageUrl: dto.imageUrl,
      data: { richBody: dto.body.slice(0, 3000) },
    });

    const broadcast = await this.broadcastModel.create({
      title: dto.title,
      body: dto.body,
      imageUrl: dto.imageUrl,
      targetGroup,
      sentCount,
      createdBy: req.admin?._id,
    });

    return { success: true, sentCount, broadcastId: String(broadcast._id) };
  }

  /** Yuborilgan broadcast'lar tarixi. */
  @Get()
  async list() {
    const items = await this.broadcastModel
      .find()
      .sort({ _id: -1 })
      .limit(50)
      .lean();
    return { items };
  }

  /** Yuborilgan broadcast yozuvini tarixdan o'chirish (userlarga qayta push ketmaydi). */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    const result = await this.broadcastModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Broadcast topilmadi');
    }
    return { success: true };
  }
}
