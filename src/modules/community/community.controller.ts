import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { CommunityFilterService } from './community-filter.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { CreateCommunityFilterDto } from './dto/create-community-filter.dto';
import { UpdateCommunityFilterDto } from './dto/update-community-filter.dto';
import { AdminGuard } from '../admin/guards/admin.guard';
import { ApiMultipartBody } from 'src/common/swagger/file-upload.decorator';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@ApiTags('Communities')
@Controller('communities')
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService,
    private readonly filterService: CommunityFilterService,
  ) {}

  // ============================================================================
  // Public — Top Communities section uchun
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'Public communities (active only)' })
  async list(
    @Query('region') region?: string,
    @Query('filter') filter?: string,
  ) {
    return this.communityService.findPublic({ region, filter });
  }

  @Get('filters')
  @ApiOperation({ summary: 'Public filter pills (active only)' })
  async filters() {
    return this.filterService.findAll({ onlyActive: true });
  }

  // ============================================================================
  // Admin — CRUD
  // ============================================================================

  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearer')
  @Get('admin/filters')
  @ApiOperation({ summary: '[Admin] All filters (including inactive)' })
  async adminListFilters() {
    return this.filterService.findAll();
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearer')
  @Post('admin/filters')
  @ApiOperation({ summary: '[Admin] Create filter' })
  @ApiStandardErrors({ auth: true, validation: true })
  async createFilter(@Body() dto: CreateCommunityFilterDto) {
    return this.filterService.create(dto);
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearer')
  @Patch('admin/filters/:id')
  @ApiOperation({ summary: '[Admin] Update filter' })
  @ApiStandardErrors({ auth: true, validation: true, notFound: true })
  async updateFilter(
    @Param('id') id: string,
    @Body() dto: UpdateCommunityFilterDto,
  ) {
    return this.filterService.update(id, dto);
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearer')
  @Delete('admin/filters/:id')
  @ApiOperation({ summary: '[Admin] Delete filter' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async deleteFilter(@Param('id') id: string) {
    return this.filterService.remove(id);
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearer')
  @Get('admin')
  @ApiOperation({ summary: '[Admin] All communities' })
  async adminList() {
    return this.communityService.findAllAdmin();
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearer')
  @Get('admin/:id')
  @ApiOperation({ summary: '[Admin] Community by id' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async adminFind(@Param('id') id: string) {
    return this.communityService.findOne(id);
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearer')
  @Post('admin')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[Admin] Create community' })
  @ApiStandardErrors({ auth: true, validation: true })
  @ApiMultipartBody(CreateCommunityDto, [{ name: 'image' }])
  async create(
    @Body() dto: CreateCommunityDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.communityService.create(dto, image);
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearer')
  @Patch('admin/:id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[Admin] Update community' })
  @ApiStandardErrors({ auth: true, validation: true, notFound: true })
  @ApiMultipartBody(UpdateCommunityDto, [{ name: 'image' }])
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommunityDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.communityService.update(id, dto, image);
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearer')
  @Delete('admin/:id')
  @ApiOperation({ summary: '[Admin] Delete community' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async remove(@Param('id') id: string) {
    return this.communityService.remove(id);
  }
}
