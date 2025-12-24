import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminUserService } from '../services/admin-user.service';
import { FindUsersDto } from '../dto/find-users.dto';
import { AdminGuard } from '../guards/admin.guard';

@UseGuards(AdminGuard)
@Controller('admins/users')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  async findUsers(@Query() dto: FindUsersDto) {
    return this.adminUserService.findUsers(dto);
  }
}
