import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { envConfig } from '../../src/config/env.config';
import { AuthService } from '../../src/modules/auth/application/auth.service';
import { AuthRepository } from '../../src/modules/auth/infrastructure/persistence/auth.repository';
import { NotificationsService } from '../../src/modules/notifications/application/notifications.service';

describe('AuthService', () => {
  it('generates access and refresh tokens', async () => {
    const passwordHash = await bcrypt.hash('Admin1234!', 10);
    const user = {
      id: 'user-1',
      email: 'admin@keuwo.local',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Keuwo',
      birthDate: null,
      phone: null,
      country: 'MX',
      occupation: null,
      city: null,
      userType: 'buyer',
      preferredContactMethod: 'whatsapp',
      isPhoneVerified: false,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
    const authRepositoryMock: Pick<
      AuthRepository,
      | 'findUserByEmail'
      | 'createSession'
      | 'ensureSeedUser'
      | 'findUserById'
      | 'findActiveSession'
      | 'revokeSession'
      | 'createEmailVerificationToken'
    > = {
      findUserByEmail: async () => user,
      createSession: async () => undefined,
      ensureSeedUser: async () => undefined,
      findUserById: async () => user,
      findActiveSession: async () => ({
        id: 'session-1',
        userId: 'user-1',
        deviceId: 'device-1',
        deviceName: null,
        deviceLocation: null,
        refreshTokenHash: passwordHash,
        userAgent: null,
        ipAddress: null,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 1000),
        createdAt: new Date(),
      }),
      revokeSession: async () => undefined,
      createEmailVerificationToken: async () => undefined,
    };
    const notificationsServiceMock: Pick<NotificationsService, 'sendEmailConfirmation'> = {
      sendEmailConfirmation: async () => undefined,
    };

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test' })],
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: authRepositoryMock,
        },
        {
          provide: NotificationsService,
          useValue: notificationsServiceMock,
        },
        {
          provide: envConfig.KEY,
          useValue: envConfig(),
        },
      ],
    }).compile();

    const service = moduleRef.get(AuthService);
    const tokens = await service.login({
      email: 'admin@keuwo.local',
      password: 'Admin1234!',
    });
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
  });
});
