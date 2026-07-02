import { Module } from '@nestjs/common';

import { UsersService } from '@modules/users/application/users.service';
import { UsersController } from '@modules/users/api/http/users.controller';
import { UsersRepository } from '@modules/users/infrastructure/persistence/users.repository';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}
