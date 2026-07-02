import { randomUUID } from 'node:crypto';

import { AuthRepository } from '@auth/infrastructure/persistence/auth.repository';
import { resolvePermissionsByUserType, UserType } from '@auth-core/rbac/permissions';
import { envConfig } from '@config/env.config';
import {
  ConflictException,
  Inject,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthenticatedUserContext {
  userId: string;
  sessionId: string;
}

interface LoginInput {
  email: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
  deviceLocation?: string;
  userAgent?: string;
  ipAddress?: string;
}

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthday: string;
  phone: string;
  country: string;
  occupation: string;
  city?: string;
  userType?: 'buyer' | 'seller' | 'agent' | 'investor';
  preferredContactMethod?: 'whatsapp' | 'phone' | 'email';
  deviceId?: string;
  deviceName?: string;
  deviceLocation?: string;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authRepository: AuthRepository,
    @Inject(envConfig.KEY)
    private readonly env: ConfigType<typeof envConfig>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSeedUser();
  }

  private async signTokenPair(
    userId: string,
    email: string,
    sessionId: string,
    permissions: string[],
  ): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, sid: sessionId, permissions },
      {
        secret: this.env.auth.accessTokenSecret,
        expiresIn: this.env.auth.accessTokenTtlSeconds,
        issuer: this.env.auth.issuer,
        audience: this.env.auth.audience,
      },
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, sid: sessionId, typ: 'refresh' },
      {
        secret: this.env.auth.refreshTokenSecret,
        expiresIn: this.env.auth.refreshTokenTtlSeconds,
        issuer: this.env.auth.issuer,
        audience: this.env.auth.audience,
      },
    );

    return { accessToken, refreshToken };
  }

  async login(input: LoginInput): Promise<TokenPair> {
    const user = await this.authRepository.findUserByEmail(input.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sessionId = randomUUID();
    const permissions = resolvePermissionsByUserType(user.userType as UserType);
    const tokens = await this.signTokenPair(user.id, input.email, sessionId, permissions);

    await this.authRepository.createSession({
      id: sessionId,
      userId: user.id,
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      deviceLocation: input.deviceLocation,
      refreshTokenHash: await this.hashToken(tokens.refreshToken),
      expiresAt: new Date(Date.now() + this.env.auth.refreshTokenTtlSeconds * 1000),
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    return tokens;
  }

  async register(input: RegisterInput): Promise<TokenPair> {
    const existingUser = await this.authRepository.findUserByEmail(input.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const createdUser = await this.authRepository.createUser({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      birthDate: input.birthday,
      phone: input.phone,
      country: input.country,
      occupation: input.occupation,
      city: input.city,
      userType: input.userType ?? 'buyer',
      preferredContactMethod: input.preferredContactMethod ?? 'whatsapp',
    });

    const sessionId = randomUUID();
    const permissions = resolvePermissionsByUserType(createdUser.userType as UserType);
    const tokens = await this.signTokenPair(
      createdUser.id,
      createdUser.email,
      sessionId,
      permissions,
    );
    await this.authRepository.createSession({
      id: sessionId,
      userId: createdUser.id,
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      deviceLocation: input.deviceLocation,
      refreshTokenHash: await this.hashToken(tokens.refreshToken),
      expiresAt: new Date(Date.now() + this.env.auth.refreshTokenTtlSeconds * 1000),
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });
    return tokens;
  }

  async refresh(
    refreshToken: string,
    metadata?: {
      deviceId?: string;
      deviceName?: string;
      deviceLocation?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<TokenPair> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        sid: string;
      }>(refreshToken, {
        secret: this.env.auth.refreshTokenSecret,
        issuer: this.env.auth.issuer,
        audience: this.env.auth.audience,
      });

      const session = await this.authRepository.findActiveSession(payload.sid, payload.sub);
      if (!session) {
        throw new UnauthorizedException('Session not found');
      }

      const isSameToken = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (!isSameToken) {
        await this.authRepository.revokeSession(session.id);
        throw new UnauthorizedException('Token reuse detected');
      }

      await this.authRepository.revokeSession(session.id);
      const user = await this.authRepository.findUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      const email = user.email;
      const newSessionId = randomUUID();
      const permissions = resolvePermissionsByUserType(user.userType as UserType);
      const tokens = await this.signTokenPair(payload.sub, email, newSessionId, permissions);
      await this.authRepository.createSession({
        id: newSessionId,
        userId: payload.sub,
        deviceId: metadata?.deviceId ?? session.deviceId,
        deviceName: metadata?.deviceName ?? session.deviceName ?? undefined,
        deviceLocation: metadata?.deviceLocation ?? session.deviceLocation ?? undefined,
        refreshTokenHash: await this.hashToken(tokens.refreshToken),
        expiresAt: new Date(Date.now() + this.env.auth.refreshTokenTtlSeconds * 1000),
        ipAddress: metadata?.ipAddress ?? session.ipAddress ?? undefined,
        userAgent: metadata?.userAgent ?? session.userAgent ?? undefined,
      });
      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async ensureSeedUser(): Promise<void> {
    const passwordHash = await bcrypt.hash(this.env.auth.seedUserPassword, 10);
    await this.authRepository.ensureSeedUser(this.env.auth.seedUserEmail, passwordHash);
  }

  async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  async listActiveSessions(context: AuthenticatedUserContext) {
    const sessions = await this.authRepository.listActiveSessions(context.userId);
    return sessions.map((session) => ({
      ...session,
      isCurrent: session.id === context.sessionId,
    }));
  }

  async logoutCurrentSession(context: AuthenticatedUserContext): Promise<void> {
    await this.authRepository.revokeSessionForUser(context.sessionId, context.userId);
  }

  async logoutSessionById(context: AuthenticatedUserContext, sessionId: string): Promise<void> {
    await this.authRepository.revokeSessionForUser(sessionId, context.userId);
  }

  async logoutOtherSessions(context: AuthenticatedUserContext): Promise<void> {
    await this.authRepository.revokeAllSessionsExcept(context.userId, context.sessionId);
  }
}
