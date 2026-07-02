import { AuthController } from '@auth/api/http/auth.controller';
import { AuthService } from '@auth/application/auth.service';
import { AuthRepository } from '@auth/infrastructure/persistence/auth.repository';
import { JwtStrategy } from '@auth-core/strategies/jwt.strategy';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { SensitiveActionTwoFactorGuard } from '@common/guards/sensitive-action-2fa.guard';
import { envConfig } from '@config/env.config';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    ConfigModule,
    NotificationsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [envConfig.KEY],
      useFactory: (env: ConfigType<typeof envConfig>) => ({
        secret: env.auth.accessTokenSecret,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    AuthRepository,
    PermissionsGuard,
    SensitiveActionTwoFactorGuard,
  ],
  exports: [AuthService, SensitiveActionTwoFactorGuard],
})
export class AuthModule {}
