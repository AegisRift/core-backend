import { AuthController } from '@auth/api/http/auth.controller';
import { AuthService } from '@auth/application/auth.service';
import { AuthRepository } from '@auth/infrastructure/persistence/auth.repository';
import { JwtStrategy } from '@auth-core/strategies/jwt.strategy';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { envConfig } from '@config/env.config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    ConfigModule,
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
  providers: [AuthService, JwtStrategy, AuthRepository, PermissionsGuard],
  exports: [AuthService],
})
export class AuthModule {}
