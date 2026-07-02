import { PERMISSIONS_KEY } from '@common/decorators/permissions.decorator';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: { permissions?: string[] };
    }>();
    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const userPermissions = request.user.permissions ?? [];
    if (userPermissions.length === 0) {
      throw new ForbiddenException('No permissions assigned');
    }

    const hasAllRequired = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
    if (!hasAllRequired) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
