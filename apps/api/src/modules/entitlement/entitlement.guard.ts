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
    // Only the route's businessId, which the handler also checks staff access for.
    // Query strings and headers are caller-controlled and must not choose the plan.
    const businessId = request.params?.businessId;

    if (!businessId) return false;

    await this.entitlementService.requireFeature(businessId, featureKey);
    return true;
  }
}
