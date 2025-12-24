import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminUserService } from '../services/admin-user.service';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { FindUsersDto } from '../dto/find-users.dto';

@UseGuards(AdminJwtAuthGuard)
@Controller('admins/users')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  async findUsers(@Query() dto: FindUsersDto) {
    return this.adminUserService.findUsers(dto);
  }
}
