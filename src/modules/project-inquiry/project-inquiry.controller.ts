import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ProjectInquiryService } from './project-inquiry.service';
import { CreateProjectInquiryDto } from './dto/create-project-inquiry.dto';
import { EnumProjectInquiryStatus } from './project-inquiry.schema';
import { AdminGuard } from '../admin/guards/admin.guard';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';
import { UpdateProjectInquiryStatusDto } from './dto/update-project-inquiry-status.dto';

@ApiTags('Project Inquiries')
@Controller('project-inquiries')
export class ProjectInquiryController {
  constructor(private readonly service: ProjectInquiryService) {}

  /**
   * Public — auth talab qilinmaydi (mehmon ham yuborishi mumkin).
   * Throttle: 5 ta/min.
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  @ApiOperation({ summary: 'Create public project inquiry' })
  async create(
    @Body() dto: CreateProjectInquiryDto,
    @Req() req: IRequestCustom,
  ) {
    return this.service.create({
      dto,
      userId: req.user?._id,
    });
  }

  // ---- Admin endpoints ----

  @UseGuards(AdminGuard)
  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: EnumProjectInquiryStatus,
  ) {
    return this.service.listForAdmin({
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 50) : 20,
      status,
    });
  }

  @UseGuards(AdminGuard)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update project inquiry status' })
  @ApiBody({ type: UpdateProjectInquiryStatusDto })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProjectInquiryStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status);
  }
}
