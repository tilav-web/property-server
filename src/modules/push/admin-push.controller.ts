import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminGuard } from '../admin/guards/admin.guard';
import { FcmService } from './fcm.service';
import { PushTokenService } from './push-token.service';
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
    @InjectModel(BroadcastNotification.name)
    private readonly broadcastModel: Model<BroadcastNotificationDocument>,
  ) {}

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
}
