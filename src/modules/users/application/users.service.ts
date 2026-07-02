import { UsersRepository } from '@modules/users/infrastructure/persistence/users.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

import { UpdateProfileDto } from '../api/http/dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async updateProfile(userId: string, body: UpdateProfileDto) {
    const updated = await this.usersRepository.updateProfile(userId, body);
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return updated;
  }
}
