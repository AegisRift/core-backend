import { AuthService } from '@auth/application/auth.service';
import { JwtAuthGuard } from '@auth-core/guards/jwt-auth.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { LoginDto } from '@dto/login.dto';
import { RefreshTokenDto } from '@dto/refresh-token.dto';
import { RegisterDto } from '@dto/register.dto';
import { ConfirmEmailDto } from '@modules/auth/api/http/dto/confirm-email.dto';
import { ContactConfirmationChallengeDto } from '@modules/auth/api/http/dto/contact-confirmation-challenge.dto';
import { ContactConfirmationVerifyDto } from '@modules/auth/api/http/dto/contact-confirmation-verify.dto';
import { TwoFactorChallengeDto } from '@modules/auth/api/http/dto/two-factor-challenge.dto';
import { TwoFactorVerifyDto } from '@modules/auth/api/http/dto/two-factor-verify.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getAuthContext(request: Request): { userId: string; sessionId: string } {
    const user = request.user as { userId: string; sessionId: string };
    return { userId: user.userId, sessionId: user.sessionId };
  }

  private getDeviceId(request: Request): string {
    const header = request.headers['x-device-id'];
    const raw = Array.isArray(header) ? header[0] : header;
    return raw?.trim() || 'unknown-device';
  }

  private getDeviceName(request: Request): string | undefined {
    const header = request.headers['x-device-name'];
    const raw = Array.isArray(header) ? header[0] : header;
    return raw?.trim() || undefined;
  }

  private getDeviceLocation(request: Request): string | undefined {
    const header = request.headers['x-device-location'];
    const raw = Array.isArray(header) ? header[0] : header;
    return raw?.trim() || undefined;
  }

  private getIpAddress(request: Request): string | undefined {
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedRaw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const firstForwardedIp = forwardedRaw?.split(',')[0]?.trim();
    return firstForwardedIp || request.ip;
  }

  private getAccessToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    if (type?.toLowerCase() !== 'bearer' || !token) {
      return undefined;
    }
    return token;
  }

  @Post('register')
  @HttpCode(201)
  async register(@Body() body: RegisterDto, @Req() request: Request) {
    const userAgent = request.headers['user-agent'];
    return this.authService.register({
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      birthday: body.birthday,
      phone: body.phone,
      country: body.country,
      occupation: body.occupation,
      city: body.city,
      userType: body.userType,
      preferredContactMethod: body.preferredContactMethod,
      deviceId: this.getDeviceId(request),
      deviceName: this.getDeviceName(request),
      deviceLocation: this.getDeviceLocation(request),
      ipAddress: this.getIpAddress(request),
      userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent,
    });
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto, @Req() request: Request) {
    const userAgent = request.headers['user-agent'];
    return this.authService.login({
      email: body.email,
      password: body.password,
      deviceId: this.getDeviceId(request),
      deviceName: this.getDeviceName(request),
      deviceLocation: this.getDeviceLocation(request),
      ipAddress: this.getIpAddress(request),
      userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent,
    });
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: RefreshTokenDto, @Req() request: Request) {
    const userAgent = request.headers['user-agent'];
    return this.authService.refresh(body.refreshToken, {
      deviceId: this.getDeviceId(request),
      deviceName: this.getDeviceName(request),
      deviceLocation: this.getDeviceLocation(request),
      ipAddress: this.getIpAddress(request),
      userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent,
    });
  }

  @Get('confirm-email')
  @HttpCode(200)
  async confirmEmail(@Query() query: ConfirmEmailDto, @Req() request: Request) {
    const userAgent = request.headers['user-agent'];
    return this.authService.confirmEmailByToken(
      query.token,
      {
        deviceId: this.getDeviceId(request),
        deviceName: this.getDeviceName(request),
        deviceLocation: this.getDeviceLocation(request),
        ipAddress: this.getIpAddress(request),
        userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent,
      },
      this.getAccessToken(request),
    );
  }

  @Post('2fa/challenge')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async requestTwoFactorChallenge(@Req() request: Request, @Body() body: TwoFactorChallengeDto) {
    return this.authService.requestTwoFactorChallenge(this.getAuthContext(request), {
      purpose: body.purpose,
    });
  }

  @Post('2fa/verify')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async verifyTwoFactorChallenge(@Req() request: Request, @Body() body: TwoFactorVerifyDto) {
    return this.authService.verifyTwoFactorChallenge(this.getAuthContext(request), {
      challengeId: body.challengeId,
      code: body.code,
      purpose: body.purpose,
    });
  }

  @Post('contact-confirmation/challenge')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async requestContactConfirmationChallenge(
    @Req() request: Request,
    @Body() body: ContactConfirmationChallengeDto,
  ) {
    return this.authService.requestContactConfirmationChallenge(this.getAuthContext(request), {
      method: body.method,
    });
  }

  @Post('contact-confirmation/verify')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async verifyContactConfirmation(
    @Req() request: Request,
    @Body() body: ContactConfirmationVerifyDto,
  ) {
    return this.authService.verifyContactConfirmationCode(this.getAuthContext(request), {
      challengeId: body.challengeId,
      code: body.code,
      method: body.method,
    });
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('self:auth:sessions:read')
  async sessions(@Req() request: Request) {
    return this.authService.listActiveSessions(this.getAuthContext(request));
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('self:auth:sessions:logout')
  async logoutCurrent(@Req() request: Request) {
    await this.authService.logoutCurrentSession(this.getAuthContext(request));
    return { success: true };
  }

  @Delete('sessions/:sessionId')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('self:auth:sessions:logout:remote')
  async logoutSession(@Req() request: Request, @Param('sessionId') sessionId: string) {
    await this.authService.logoutSessionById(this.getAuthContext(request), sessionId);
    return { success: true };
  }

  @Post('logout-others')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('self:auth:sessions:logout:others')
  async logoutOthers(@Req() request: Request) {
    await this.authService.logoutOtherSessions(this.getAuthContext(request));
    return { success: true };
  }
}
