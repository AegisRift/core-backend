import { envConfig } from '@config/env.config';
import { TWO_FACTOR_PURPOSE_KEY } from '@common/decorators/two-factor-purpose.decorator';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { TwoFactorPurpose } from '@modules/auth/application/auth.types';

@Injectable()
export class SensitiveActionTwoFactorGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    @Inject(envConfig.KEY)
    private readonly env: ConfigType<typeof envConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPurpose = this.reflector.getAllAndOverride<TwoFactorPurpose | undefined>(
      TWO_FACTOR_PURPOSE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPurpose) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { userId: string };
      headers: Record<string, string | string[] | undefined>;
    }>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const rawHeader = request.headers['x-2fa-token'];
    const verificationToken = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (!verificationToken) {
      throw new UnauthorizedException('Missing x-2fa-token header');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        typ: string;
        purpose: TwoFactorPurpose;
      }>(verificationToken, {
        secret: this.env.auth.twoFactorTokenSecret,
        issuer: this.env.auth.issuer,
        audience: this.env.auth.audience,
      });

      if (payload.typ !== '2fa' || payload.sub !== userId || payload.purpose !== requiredPurpose) {
        throw new UnauthorizedException('Invalid 2FA token');
      }
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired 2FA token');
    }
  }
}
