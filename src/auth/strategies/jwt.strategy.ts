import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { envConfig } from '../../config/env.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(envConfig.KEY)
    env: ConfigType<typeof envConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.auth.accessTokenSecret,
      issuer: env.auth.issuer,
      audience: env.auth.audience,
    });
  }

  validate(payload: { sub: string; email: string; sid: string; permissions?: string[] }) {
    return {
      userId: payload.sub,
      email: payload.email,
      sessionId: payload.sid,
      permissions: payload.permissions ?? [],
    };
  }
}
