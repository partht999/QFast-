import { PrismaClient, PlanTier } from '@prisma/client';

const prisma = new PrismaClient();

type Feature = { featureKey: string; enabled: boolean; limitValue?: number | null };

const keys = [
  'queue.enabled',
  'reservations.enabled',
  'table_ordering.enabled',
  'takeaway.enabled',
  'kds.enabled',
  'menu.multilingual',
  'staff.limit',
  'branches',
  'reviews.google_prompt',
  'reviews.feedback_inbox',
  'analytics.basic',
  'payments.online',
  'whatsapp.enabled',
  'loyalty.program',
  'offers.enabled',
  'campaigns.enabled',
  'sponsorships.enabled',
  'analytics.advanced',
  'integrations.third_party',
  'api.access',
  'split_bill',
  'tips',
  'no_show_deposit',
  'feedback.recovery_workflow',
  'loyalty.tiers',
  'customer_profiles.full',
];

function features(enabled: Record<string, boolean | number>): Feature[] {
  return keys.map((featureKey) => {
    const value = enabled[featureKey];
    if (typeof value === 'number') return { featureKey, enabled: true, limitValue: value };
    return { featureKey, enabled: Boolean(value), limitValue: null };
  });
}

async function savePlan(
  tier: PlanTier,
  data: { name: string; description: string; priceMonthly: number; priceYearly: number },
  planFeatures: Feature[],
) {
  const plan = await prisma.plan.upsert({
    where: { tier },
    update: { ...data, isActive: true },
    create: { tier, ...data },
  });
  await prisma.planFeature.deleteMany({ where: { planId: plan.id } });
  await prisma.planFeature.createMany({
    data: planFeatures.map((feature) => ({ ...feature, planId: plan.id })),
  });
  return plan;
}

async function main() {
  console.log('Seeding plans...');

  const free = await savePlan(
    PlanTier.FREE,
    {
      name: 'Free',
      description: 'One live queue, an entrance QR, and a staff board.',
      priceMonthly: 0,
      priceYearly: 0,
    },
    features({
      'queue.enabled': true,
      'staff.limit': 3,
      branches: 1,
    }),
  );

  const plus = await savePlan(
    PlanTier.ESSENTIAL,
    {
      name: 'Plus',
      description: 'Multiple counters, live wait times, table ordering, and review prompts.',
      priceMonthly: 999,
      priceYearly: 9990,
    },
    features({
      'queue.enabled': true,
      'table_ordering.enabled': true,
      'takeaway.enabled': true,
      'reviews.google_prompt': true,
      'reviews.feedback_inbox': true,
      'analytics.basic': true,
      'staff.limit': 10,
      branches: 1,
    }),
  );

  const pro = await savePlan(
    PlanTier.ADVANCED,
    {
      name: 'Pro',
      description: 'The full workspace. The first month is free, then ₹3,999/month.',
      priceMonthly: 3999,
      priceYearly: 39990,
    },
    features(Object.fromEntries(keys.map((key) => [key, key === 'branches' || key === 'staff.limit' ? -1 : true]))),
  );

  console.log('Seed complete');
  console.log(`   Free: ${free.id}`);
  console.log(`   Plus: ${plus.id}`);
  console.log(`   Pro:  ${pro.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
