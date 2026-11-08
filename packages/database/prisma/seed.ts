import { PrismaClient, PlanTier, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Plans ──────────────────────────────────────────────────────────────────
  const essential = await prisma.plan.upsert({
    where: { tier: PlanTier.ESSENTIAL },
    update: {},
    create: {
      name: 'Essential',
      tier: PlanTier.ESSENTIAL,
      description: 'Complete restaurant operations — queue, ordering, kitchen and analytics.',
      priceMonthly: 999,
      priceYearly: 9990,
      features: {
        create: [
          { featureKey: 'queue.enabled',           enabled: true  },
          { featureKey: 'reservations.enabled',     enabled: true  },
          { featureKey: 'table_ordering.enabled',   enabled: true  },
          { featureKey: 'takeaway.enabled',         enabled: true  },
          { featureKey: 'kds.enabled',              enabled: true  },
          { featureKey: 'menu.multilingual',        enabled: true,  limitValue: 1 },
          { featureKey: 'staff.limit',              enabled: true,  limitValue: 5 },
          { featureKey: 'branches',                 enabled: true,  limitValue: 1 },
          { featureKey: 'reviews.google_prompt',    enabled: true  },
          { featureKey: 'reviews.feedback_inbox',   enabled: true  },
          { featureKey: 'analytics.basic',          enabled: true  },
          { featureKey: 'payments.online',          enabled: false },
          { featureKey: 'whatsapp.enabled',         enabled: false },
          { featureKey: 'loyalty.program',          enabled: false },
          { featureKey: 'offers.enabled',           enabled: false },
          { featureKey: 'campaigns.enabled',        enabled: false },
          { featureKey: 'sponsorships.enabled',     enabled: false },
          { featureKey: 'analytics.advanced',       enabled: false },
          { featureKey: 'integrations.third_party', enabled: false },
          { featureKey: 'api.access',               enabled: false },
          { featureKey: 'split_bill',               enabled: false },
          { featureKey: 'tips',                     enabled: false },
          { featureKey: 'no_show_deposit',          enabled: false },
          { featureKey: 'feedback.recovery_workflow', enabled: false },
          { featureKey: 'loyalty.tiers',            enabled: false },
          { featureKey: 'customer_profiles.full',   enabled: false },
        ],
      },
    },
  });

  const advanced = await prisma.plan.upsert({
    where: { tier: PlanTier.ADVANCED },
    update: {},
    create: {
      name: 'Advanced',
      tier: PlanTier.ADVANCED,
      description: 'Full platform — payments, loyalty, offers, analytics and sponsored placements.',
      priceMonthly: 2999,
      priceYearly: 29990,
      features: {
        create: [
          { featureKey: 'queue.enabled',              enabled: true                },
          { featureKey: 'reservations.enabled',       enabled: true                },
          { featureKey: 'table_ordering.enabled',     enabled: true                },
          { featureKey: 'takeaway.enabled',           enabled: true                },
          { featureKey: 'kds.enabled',                enabled: true                },
          { featureKey: 'menu.multilingual',          enabled: true,  limitValue: -1 },
          { featureKey: 'staff.limit',                enabled: false               },
          { featureKey: 'branches',                   enabled: true,  limitValue: -1 },
          { featureKey: 'reviews.google_prompt',      enabled: true                },
          { featureKey: 'reviews.feedback_inbox',     enabled: true                },
          { featureKey: 'analytics.basic',            enabled: true                },
          { featureKey: 'payments.online',            enabled: true                },
          { featureKey: 'whatsapp.enabled',           enabled: true                },
          { featureKey: 'loyalty.program',            enabled: true                },
          { featureKey: 'offers.enabled',             enabled: true                },
          { featureKey: 'campaigns.enabled',          enabled: true                },
          { featureKey: 'sponsorships.enabled',       enabled: true                },
          { featureKey: 'analytics.advanced',         enabled: true                },
          { featureKey: 'integrations.third_party',   enabled: true                },
          { featureKey: 'api.access',                 enabled: true                },
          { featureKey: 'split_bill',                 enabled: true                },
          { featureKey: 'tips',                       enabled: true                },
          { featureKey: 'no_show_deposit',            enabled: true                },
          { featureKey: 'feedback.recovery_workflow', enabled: true                },
          { featureKey: 'loyalty.tiers',              enabled: true                },
          { featureKey: 'customer_profiles.full',     enabled: true                },
        ],
      },
    },
  });

  // ── Super admin ────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@Qfast1!', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@qfast.app' },
    update: {},
    create: {
      email: 'admin@qfast.app',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });

  console.log('✅ Seed complete');
  console.log(`   Essential plan: ${essential.id}`);
  console.log(`   Advanced plan:  ${advanced.id}`);
  console.log(`   Super admin:    ${superAdmin.email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

