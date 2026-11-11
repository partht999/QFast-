import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementSet } from '@qfast/shared';

@Injectable()
export class EntitlementService {
  private cache = new Map<string, { data: EntitlementSet; cachedAt: number }>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 min cache

  constructor(private prisma: PrismaService) {}

  async getEntitlements(businessId: string): Promise<EntitlementSet> {
    const cached = this.cache.get(businessId);
    if (cached && Date.now() - cached.cachedAt < this.TTL_MS) {
      return cached.data;
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
      include: { plan: { include: { features: true } } },
    });

    const overrides = await this.prisma.subscriptionOverride.findMany({
      where: {
        businessId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    const features: EntitlementSet['features'] = {};

    if (subscription?.plan?.features) {
      for (const f of subscription.plan.features) {
        features[f.featureKey] = {
          enabled: f.enabled,
          limit: f.limitValue !== null ? f.limitValue : undefined,
        };
      }
    }

    for (const o of overrides) {
      features[o.featureKey] = {
        enabled: o.enabled,
        limit: o.limitValue !== null ? o.limitValue : undefined,
      };
    }

    const result: EntitlementSet = { features };
    this.cache.set(businessId, { data: result, cachedAt: Date.now() });
    return result;
  }

  async requireFeature(businessId: string, featureKey: string): Promise<void> {
    const entitlements = await this.getEntitlements(businessId);
    const feature = entitlements.features[featureKey];
    if (!feature?.enabled) {
      throw new ForbiddenException(
        `Feature '${featureKey}' is not included in the current subscription.`,
      );
    }
  }

  invalidateCache(businessId: string) {
    this.cache.delete(businessId);
  }
}
