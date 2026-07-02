import { DrizzleService } from '@infrastructure/database/drizzle/drizzle.service';
import { authUsers } from '@infrastructure/database/drizzle/schema/auth.schema';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  birthday?: string;
  phone?: string;
  country?: string;
  occupation?: string;
  city?: string;
  userType?: 'buyer' | 'seller' | 'agent' | 'investor';
  preferredContactMethod?: 'whatsapp' | 'phone' | 'email';
}

@Injectable()
export class UsersRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const [updatedUser] = await this.drizzle.db
      .update(authUsers)
      .set({
        firstName: input.firstName,
        lastName: input.lastName,
        birthDate: input.birthday,
        phone: input.phone,
        country: input.country,
        occupation: input.occupation,
        city: input.city,
        userType: input.userType,
        preferredContactMethod: input.preferredContactMethod,
        updatedAt: new Date(),
      })
      .where(eq(authUsers.id, userId))
      .returning({
        id: authUsers.id,
        email: authUsers.email,
        firstName: authUsers.firstName,
        lastName: authUsers.lastName,
        birthDate: authUsers.birthDate,
        phone: authUsers.phone,
        country: authUsers.country,
        occupation: authUsers.occupation,
        city: authUsers.city,
        userType: authUsers.userType,
        preferredContactMethod: authUsers.preferredContactMethod,
      });
    return updatedUser;
  }
}
