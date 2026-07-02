import { JwtAuthGuard } from '@auth-core/guards/jwt-auth.guard';
import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { UsersService } from '@modules/users/application/users.service';

import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() request: Request, @Body() body: UpdateProfileDto) {
    const user = request.user as { userId: string };
    return this.usersService.updateProfile(user.userId, body);
  }
}
