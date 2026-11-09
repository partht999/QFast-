export const PLAN_IDS = ['free', 'plus', 'pro'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export function isPlanId(value: string | null | undefined): value is PlanId {
  return value === 'free' || value === 'plus' || value === 'pro';
}

export const PLANS: Array<{
  id: PlanId;
  name: string;
  price: string;
  period: string;
  audience: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
  badge?: string;
}> = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    audience: 'One location getting started',
    description: 'A real queue your team can run today, without a card.',
    features: [
      'One live queue',
      'Entrance QR and a private customer link',
      'Staff board to call the next person',
      'Walk-in entry at the counter',
      'One location',
    ],
    cta: 'Start free',
    href: '/auth/register?plan=free',
    highlighted: false,
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '₹999',
    period: '/ month',
    audience: 'Busy counters and service desks',
    description: 'Several lines, a live wait, and the tools a single location needs.',
    features: [
      'Everything in Free',
      'Multiple counters, doctors, or desks',
      'Live wait time on the customer page',
      'Table ordering for restaurants and cafes',
      'Google review prompts',
      'Up to 10 staff',
    ],
    cta: 'Choose Plus',
    href: '/auth/register?plan=plus',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹3,999',
    period: '/ month',
    audience: 'Teams that want the full workspace',
    description: 'Kitchen, loyalty, and more than one location. The first month is free.',
    features: [
      'Everything in Plus',
      'Kitchen display for restaurants',
      'Loyalty points and rewards',
      'More than one location',
      'Staff roles',
      'Priority support',
    ],
    cta: 'Try Pro free for a month',
    href: '/auth/register?plan=pro',
    highlighted: true,
    badge: 'First month free',
  },
];
