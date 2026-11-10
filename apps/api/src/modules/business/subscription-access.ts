import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export async function visitsAreOpen(prisma: PrismaService, businessId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  if (!subscription) {
    return { open: false, status: SubscriptionStatus.LAPSED, trialEndsAt: null as Date | null };
  }

  const now = new Date();
  const trialEnded = Boolean(subscription.trialEndsAt && subscription.trialEndsAt <= now);
  const periodEnded = subscription.currentPeriodEnd <= now;
  const shouldLapse =
    subscription.status !== SubscriptionStatus.CANCELED &&
    subscription.status !== SubscriptionStatus.LAPSED &&
    ((subscription.status === SubscriptionStatus.TRIALING && trialEnded) ||
      ((subscription.status === SubscriptionStatus.ACTIVE ||
        subscription.status === SubscriptionStatus.TRIALING ||
        subscription.status === SubscriptionStatus.PAST_DUE) &&
        periodEnded));

  if (shouldLapse) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.LAPSED },
    });
    return { open: false, status: SubscriptionStatus.LAPSED, trialEndsAt: subscription.trialEndsAt };
  }

  const open =
    subscription.status === SubscriptionStatus.ACTIVE || subscription.status === SubscriptionStatus.TRIALING;
  return { open, status: subscription.status, trialEndsAt: subscription.trialEndsAt };
}
