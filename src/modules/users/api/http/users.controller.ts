import { JwtAuthGuard } from '@auth-core/guards/jwt-auth.guard';
import { TwoFactorPurposeRequired } from '@common/decorators/two-factor-purpose.decorator';
import { SensitiveActionTwoFactorGuard } from '@common/guards/sensitive-action-2fa.guard';
import { UsersService } from '@modules/users/application/users.service';
import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('profile')
  @UseGuards(JwtAuthGuard, SensitiveActionTwoFactorGuard)
  @TwoFactorPurposeRequired('update-profile')
  async updateProfile(@Req() request: Request, @Body() body: UpdateProfileDto) {
    const user = request.user as { userId: string };
    return this.usersService.updateProfile(user.userId, body);
  }
}
