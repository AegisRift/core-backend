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
      findUserByEmail: async () => ({
        id: 'user-1',
        email: 'admin@keuwo.local',
        passwordHash,
        isActive: true,
        createdAt: new Date(),
      }),
      createSession: async () => undefined,
      ensureSeedUser: async () => undefined,
      findUserById: async () => ({
        id: 'user-1',
        email: 'admin@keuwo.local',
        passwordHash,
        isActive: true,
        createdAt: new Date(),
      }),
      findActiveSession: async () => ({
        id: 'session-1',
        userId: 'user-1',
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
