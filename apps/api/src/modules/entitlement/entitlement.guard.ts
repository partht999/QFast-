import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY_METADATA } from './requires-feature.decorator';
import { EntitlementService } from './entitlement.service';

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private entitlementService: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(FEATURE_KEY_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!featureKey) return true;

    const request = context.switchToHttp().getRequest();
    const businessId =
      request.user?.businessId ||
      request.params?.businessId ||
      request.query?.businessId ||
      request.headers['x-business-id'];

    if (!businessId) return false;

    await this.entitlementService.requireFeature(businessId, featureKey);
    return true;
  }
}
