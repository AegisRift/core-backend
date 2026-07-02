import { DrizzleService } from '@infrastructure/database/drizzle/drizzle.service';
import { authSessions, authUsers } from '@infrastructure/database/drizzle/schema/auth.schema';
import { Injectable } from '@nestjs/common';
import { and, eq, gt } from 'drizzle-orm';

interface SessionInput {
  id: string;
  userId: string;
  deviceId?: string;
  deviceName?: string;
  deviceLocation?: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  phone?: string;
  country: string;
  occupation?: string;
  city?: string;
  userType: string;
  preferredContactMethod: string;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findUserByEmail(email: string) {
    const [user] = await this.drizzle.db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, email))
      .limit(1);
    return user;
  }

  async findUserById(id: string) {
    const [user] = await this.drizzle.db
      .select()
      .from(authUsers)
      .where(eq(authUsers.id, id))
      .limit(1);
    return user;
  }

  async createSession(input: SessionInput): Promise<void> {
    await this.drizzle.db.insert(authSessions).values(input);
  }

  async findActiveSession(id: string, userId: string) {
    const [session] = await this.drizzle.db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.id, id),
          eq(authSessions.userId, userId),
          eq(authSessions.isRevoked, false),
        ),
      )
      .limit(1);
    return session;
  }

  async revokeSession(id: string): Promise<void> {
    await this.drizzle.db
      .update(authSessions)
      .set({ isRevoked: true })
      .where(eq(authSessions.id, id));
  }

  async revokeSessionForUser(sessionId: string, userId: string): Promise<void> {
    await this.drizzle.db
      .update(authSessions)
      .set({ isRevoked: true })
      .where(and(eq(authSessions.id, sessionId), eq(authSessions.userId, userId)));
  }

  async revokeAllSessionsExcept(userId: string, keepSessionId: string): Promise<void> {
    const sessions = await this.drizzle.db
      .select({ id: authSessions.id })
      .from(authSessions)
      .where(and(eq(authSessions.userId, userId), eq(authSessions.isRevoked, false)));

    const idsToRevoke = sessions
      .filter((session) => session.id !== keepSessionId)
      .map((session) => session.id);
    if (idsToRevoke.length === 0) {
      return;
    }

    await Promise.all(idsToRevoke.map((sessionId) => this.revokeSessionForUser(sessionId, userId)));
  }

  async listActiveSessions(userId: string) {
    return this.drizzle.db
      .select({
        id: authSessions.id,
        deviceId: authSessions.deviceId,
        deviceName: authSessions.deviceName,
        deviceLocation: authSessions.deviceLocation,
        ipAddress: authSessions.ipAddress,
        userAgent: authSessions.userAgent,
        createdAt: authSessions.createdAt,
        expiresAt: authSessions.expiresAt,
      })
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, userId),
          eq(authSessions.isRevoked, false),
          gt(authSessions.expiresAt, new Date()),
        ),
      );
  }

  async ensureSeedUser(email: string, passwordHash: string): Promise<void> {
    const existing = await this.findUserByEmail(email);
    if (existing) {
      return;
    }
    await this.drizzle.db.insert(authUsers).values({
      email,
      passwordHash,
      firstName: 'Keuwo',
      lastName: 'Admin',
      country: 'MX',
      occupation: 'Administrator',
      city: 'Monterrey',
      userType: 'agent',
      preferredContactMethod: 'email',
    });
  }

  async createUser(input: CreateUserInput) {
    const [createdUser] = await this.drizzle.db
      .insert(authUsers)
      .values({
        email: input.email,
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        birthDate: input.birthDate,
        phone: input.phone,
        country: input.country,
        occupation: input.occupation,
        city: input.city,
        userType: input.userType,
        preferredContactMethod: input.preferredContactMethod,
      })
      .returning();
    return createdUser;
  }
}
