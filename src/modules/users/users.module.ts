import { AuthModule } from '@modules/auth/auth.module';
import { UsersController } from '@modules/users/api/http/users.controller';
import { UsersService } from '@modules/users/application/users.service';
import { UsersRepository } from '@modules/users/infrastructure/persistence/users.repository';
import { Module } from '@nestjs/common';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}
