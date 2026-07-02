import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';

import {
  TwoFactorChannel,
  TwoFactorPurpose,
  SENSITIVE_TWO_FACTOR_PURPOSES,
} from '@auth/application/auth.types';
import { AuthRepository } from '@auth/infrastructure/persistence/auth.repository';
import { resolvePermissionsByUserType, UserType } from '@auth-core/rbac/permissions';
import { envConfig } from '@config/env.config';
import { NotificationsService } from '@modules/notifications/application/notifications.service';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
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

interface ContactConfirmationInput {
  method: 'email' | 'phone';
}

interface TwoFactorChallengeInput {
  purpose: TwoFactorPurpose;
}

interface TwoFactorVerifyInput {
  challengeId: string;
  code: string;
  purpose: TwoFactorPurpose;
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

interface RequestMetadata {
  deviceId?: string;
  deviceName?: string;
  deviceLocation?: string;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly authRepository: AuthRepository,
    private readonly notificationsService: NotificationsService,
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

  private async createSessionForUser(
    user: { id: string; email: string; userType: string },
    metadata?: RequestMetadata,
  ): Promise<TokenPair> {
    const sessionId = randomUUID();
    const permissions = resolvePermissionsByUserType(user.userType as UserType);
    const tokens = await this.signTokenPair(user.id, user.email, sessionId, permissions);

    await this.authRepository.createSession({
      id: sessionId,
      userId: user.id,
      deviceId: metadata?.deviceId,
      deviceName: metadata?.deviceName,
      deviceLocation: metadata?.deviceLocation,
      refreshTokenHash: await this.hashToken(tokens.refreshToken),
      expiresAt: new Date(Date.now() + this.env.auth.refreshTokenTtlSeconds * 1000),
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    });

    return tokens;
  }

  private generateFourDigitCode(): string {
    return String(randomInt(0, 10000)).padStart(4, '0');
  }

  private createVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashDeterministicToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildEmailConfirmationUrl(token: string): string {
    const baseUrl = this.env.notifications.frontendVerifyEmailUrl;
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  }

  private getTwoFactorMinutesToExpire(): number {
    return Math.max(1, Math.ceil(this.env.auth.twoFactorCodeTtlSeconds / 60));
  }

  private async createAndDispatchChallenge(input: {
    userId: string;
    firstName: string;
    email: string;
    phone?: string | null;
    purpose: TwoFactorPurpose;
    preferredChannel: TwoFactorChannel;
  }) {
    const code = this.generateFourDigitCode();
    const channel: TwoFactorChannel =
      input.preferredChannel === 'phone' && input.phone ? 'phone' : 'email';
    const challenge = await this.authRepository.createAuthChallenge({
      userId: input.userId,
      purpose: input.purpose,
      channel,
      codeHash: await this.hashToken(code),
      expiresAt: new Date(Date.now() + this.env.auth.twoFactorCodeTtlSeconds * 1000),
      maxAttempts: this.env.auth.twoFactorMaxAttempts,
      metadata: { requestedChannel: input.preferredChannel },
    });

    if (channel === 'phone' && input.phone) {
      await this.notificationsService.sendTwoFactorCodeByPhone({
        to: input.phone,
        code,
      });
    } else {
      await this.notificationsService.sendTwoFactorCodeByEmail({
        to: input.email,
        firstName: input.firstName,
        code,
        minutesToExpire: this.getTwoFactorMinutesToExpire(),
      });
    }

    return challenge;
  }

  private async issueEmailConfirmation(user: { id: string; email: string; firstName: string }) {
    const token = this.createVerificationToken();
    const tokenHash = this.hashDeterministicToken(token);
    await this.authRepository.createEmailVerificationToken({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + this.env.auth.emailVerificationTokenTtlSeconds * 1000),
    });

    await this.notificationsService.sendEmailConfirmation({
      to: user.email,
      firstName: user.firstName,
      confirmationUrl: this.buildEmailConfirmationUrl(token),
    });
  }

  private async hasActiveSessionFromAccessToken(accessToken?: string): Promise<boolean> {
    if (!accessToken) {
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; sid: string }>(accessToken, {
        secret: this.env.auth.accessTokenSecret,
        issuer: this.env.auth.issuer,
        audience: this.env.auth.audience,
      });
      const session = await this.authRepository.findActiveSession(payload.sid, payload.sub);
      return Boolean(session);
    } catch {
      return false;
    }
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

    return this.createSessionForUser(user, input);
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

    const tokens = await this.createSessionForUser(createdUser, input);
    try {
      await this.issueEmailConfirmation({
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send confirmation email for user ${createdUser.id}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

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
      return this.createSessionForUser(user, {
        deviceId: metadata?.deviceId ?? session.deviceId,
        deviceName: metadata?.deviceName ?? session.deviceName ?? undefined,
        deviceLocation: metadata?.deviceLocation ?? session.deviceLocation ?? undefined,
        ipAddress: metadata?.ipAddress ?? session.ipAddress ?? undefined,
        userAgent: metadata?.userAgent ?? session.userAgent ?? undefined,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async confirmEmailByToken(
    token: string,
    metadata?: RequestMetadata,
    accessToken?: string,
  ): Promise<{
    confirmed: boolean;
    alreadyAuthenticated: boolean;
    tokens?: TokenPair;
  }> {
    const tokenHash = this.hashDeterministicToken(token);
    const verificationToken = await this.authRepository.findValidEmailVerificationToken(tokenHash);
    if (!verificationToken) {
      throw new UnauthorizedException('Invalid or expired confirmation token');
    }

    await this.authRepository.consumeEmailVerificationToken(verificationToken.id);
    await this.authRepository.markEmailVerified(verificationToken.userId);

    const hasSession = await this.hasActiveSessionFromAccessToken(accessToken);
    if (hasSession) {
      return { confirmed: true, alreadyAuthenticated: true };
    }

    const user = await this.authRepository.findUserById(verificationToken.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not available for autologin');
    }

    const tokens = await this.createSessionForUser(user, metadata);
    return { confirmed: true, alreadyAuthenticated: false, tokens };
  }

  async requestTwoFactorChallenge(
    context: AuthenticatedUserContext,
    input: TwoFactorChallengeInput,
  ) {
    if (!SENSITIVE_TWO_FACTOR_PURPOSES.includes(input.purpose)) {
      throw new BadRequestException('Unsupported 2FA purpose');
    }

    const user = await this.authRepository.findUserById(context.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const challenge = await this.createAndDispatchChallenge({
      userId: user.id,
      firstName: user.firstName,
      email: user.email,
      phone: user.phone,
      purpose: input.purpose,
      preferredChannel: user.phone ? 'phone' : 'email',
    });

    return {
      challengeId: challenge.id,
      channel: challenge.channel,
      expiresAt: challenge.expiresAt,
    };
  }

  async verifyTwoFactorChallenge(
    context: AuthenticatedUserContext,
    input: TwoFactorVerifyInput,
  ): Promise<{ verificationToken: string; expiresInSeconds: number }> {
    if (!SENSITIVE_TWO_FACTOR_PURPOSES.includes(input.purpose)) {
      throw new BadRequestException('Unsupported 2FA purpose');
    }

    const challenge = await this.authRepository.findChallengeById(input.challengeId);
    if (
      !challenge ||
      challenge.userId !== context.userId ||
      challenge.purpose !== input.purpose ||
      challenge.consumedAt ||
      challenge.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid challenge');
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      throw new UnauthorizedException('Challenge max attempts reached');
    }

    const isCodeValid = await bcrypt.compare(input.code, challenge.codeHash);
    if (!isCodeValid) {
      await this.authRepository.incrementChallengeAttempts(challenge.id, challenge.attempts);
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.authRepository.consumeChallenge(challenge.id);
    const verificationToken = await this.jwtService.signAsync(
      {
        sub: context.userId,
        typ: '2fa',
        purpose: input.purpose,
      },
      {
        secret: this.env.auth.twoFactorTokenSecret,
        expiresIn: this.env.auth.twoFactorVerificationTokenTtlSeconds,
        issuer: this.env.auth.issuer,
        audience: this.env.auth.audience,
      },
    );

    return {
      verificationToken,
      expiresInSeconds: this.env.auth.twoFactorVerificationTokenTtlSeconds,
    };
  }

  async requestContactConfirmationChallenge(
    context: AuthenticatedUserContext,
    input: ContactConfirmationInput,
  ) {
    const user = await this.authRepository.findUserById(context.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (input.method === 'phone' && !user.phone) {
      throw new BadRequestException('Phone number is not registered for this user');
    }

    const purpose: TwoFactorPurpose = input.method === 'phone' ? 'confirm-phone' : 'confirm-email';
    const challenge = await this.createAndDispatchChallenge({
      userId: user.id,
      firstName: user.firstName,
      email: user.email,
      phone: user.phone,
      purpose,
      preferredChannel: input.method,
    });

    return {
      challengeId: challenge.id,
      method: input.method,
      channel: challenge.channel,
      expiresAt: challenge.expiresAt,
    };
  }

  async verifyContactConfirmationCode(
    context: AuthenticatedUserContext,
    input: {
      challengeId: string;
      code: string;
      method: 'email' | 'phone';
    },
  ): Promise<{ verifiedMethod: 'email' | 'phone' }> {
    const expectedPurpose: TwoFactorPurpose =
      input.method === 'phone' ? 'confirm-phone' : 'confirm-email';

    const challenge = await this.authRepository.findChallengeById(input.challengeId);
    if (
      !challenge ||
      challenge.userId !== context.userId ||
      challenge.purpose !== expectedPurpose ||
      challenge.consumedAt ||
      challenge.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid challenge');
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      throw new UnauthorizedException('Challenge max attempts reached');
    }

    const isCodeValid = await bcrypt.compare(input.code, challenge.codeHash);
    if (!isCodeValid) {
      await this.authRepository.incrementChallengeAttempts(challenge.id, challenge.attempts);
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.authRepository.consumeChallenge(challenge.id);
    if (input.method === 'phone') {
      await this.authRepository.markPhoneVerified(context.userId);
    } else {
      await this.authRepository.markEmailVerified(context.userId);
    }

    return { verifiedMethod: input.method };
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
