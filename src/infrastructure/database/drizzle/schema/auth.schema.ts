import { boolean, date, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const authUsers = pgTable(
  'auth_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    birthDate: date('birth_date'),
    phone: text('phone'),
    country: text('country').notNull(),
    occupation: text('occupation'),
    city: text('city'),
    userType: text('user_type').notNull().default('buyer'),
    preferredContactMethod: text('preferred_contact_method').notNull().default('whatsapp'),
    isPhoneVerified: boolean('is_phone_verified').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_auth_users_email').on(table.email)],
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    deviceId: text('device_id').notNull().default('unknown-device'),
    deviceName: text('device_name'),
    deviceLocation: text('device_location'),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    isRevoked: boolean('is_revoked').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_auth_sessions_user').on(table.userId),
    index('idx_auth_sessions_device').on(table.deviceId),
    index('idx_auth_sessions_device_name').on(table.deviceName),
  ],
);
