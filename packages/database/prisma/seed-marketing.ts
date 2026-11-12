import {
  BusinessStatus,
  BusinessType,
  FeedbackStatus,
  LoyaltyProgramType,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PlanTier,
  QueueEntrySource,
  QueueTokenStatus,
  ReservationStatus,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const businessSlug = 'qfast-marketing-demo';
const demoBusinessName = 'Copper Kettle Kitchen';
const ownerEmail = 'marketing-demo@qfast.local';
const ownerPassword = process.env.MARKETING_DEMO_PASSWORD || 'QfastDemo2026!';
const dayMs = 24 * 60 * 60 * 1000;

const categories = [
  {
    name: 'Small Plates',
    items: [
      ['Crispy Lotus Stem', 285, true, 'Fan favourite', 'Tossed with sesame, chilli and a touch of honey.', 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=320&q=80'],
      ['Paneer Tikka', 325, true, 'Chef pick', 'Chargrilled cottage cheese with mint yoghurt.', 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=320&q=80'],
      ['Chicken Pepper Fry', 365, false, 'Popular', 'Pepper-crusted chicken with curry leaves.', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=320&q=80'],
      ['Masala Corn Ribs', 245, true, null, 'Sweet corn, smoked paprika and lime.', 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=320&q=80'],
    ],
  },
  {
    name: 'From the Kitchen',
    items: [
      ['Smoky Butter Paneer', 385, true, 'Bestseller', 'Tandoor-finished paneer in a silky tomato gravy.', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=320&q=80'],
      ['Coastal Chicken Curry', 425, false, null, 'Slow-cooked coconut curry with fresh curry leaves.', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=320&q=80'],
      ['Mushroom Pepper Rice', 315, true, 'Veg', 'Wok-tossed rice, mushrooms and cracked pepper.', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=320&q=80'],
      ['Crispy Fish & Chips', 445, false, 'House special', 'Golden fish, herb fries and house tartare.', 'https://images.unsplash.com/photo-1579208030886-b937da0925dc?auto=format&fit=crop&w=320&q=80'],
    ],
  },
  {
    name: 'Wood-fired Pizzas',
    items: [
      ['Garden Margherita', 365, true, 'Bestseller', 'San Marzano tomato, basil and fior di latte.', 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=320&q=80'],
      ['Roasted Mushroom', 425, true, null, 'Wild mushrooms, thyme and parmesan cream.', 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=320&q=80'],
      ['Smoked Chicken', 465, false, 'Chef pick', 'Smoked chicken, onion jam and chilli oil.', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=320&q=80'],
      ['Four Cheese', 445, true, null, 'Mozzarella, cheddar, blue cheese and parmesan.', 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=320&q=80'],
    ],
  },
  {
    name: 'Something Sweet',
    items: [
      ['Warm Chocolate Brownie', 225, true, 'Bestseller', 'Dark chocolate brownie with vanilla bean ice cream.', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=320&q=80'],
      ['Baked Cheesecake', 255, true, null, 'New York-style cheesecake with berry compote.', 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=320&q=80'],
      ['Filter Coffee Panna Cotta', 215, true, 'House special', 'Silky coffee cream with a caramel crunch.', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=320&q=80'],
    ],
  },
  {
    name: 'Drinks',
    items: [
      ['House Lime Soda', 125, true, null, 'Fresh lime, soda and a pinch of rock salt.', 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=320&q=80'],
      ['Mango & Basil Cooler', 185, true, 'Seasonal', 'Alphonso mango, basil and sparkling water.', 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=320&q=80'],
      ['Cold Brew Tonic', 195, true, null, '18-hour cold brew, tonic and orange peel.', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=320&q=80'],
      ['Masala Chai', 95, true, null, 'Freshly brewed Assam tea with warming spices.', 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=320&q=80'],
    ],
  },
];

const guestNames = [
  'Aarav Mehta', 'Nisha Kapoor', 'Kabir Shah', 'Ira Nair', 'Rohan Desai',
  'Tara Menon', 'Vivaan Rao', 'Mira Joshi', 'Arjun Iyer', 'Sana Khan',
  'Dev Malhotra', 'Anika Bose', 'Reyansh Jain', 'Diya Kulkarni', 'Neil Thomas',
  'Myra Sethi', 'Aditya Roy', 'Zoya Fernandes',
];

const tokenStatuses = [
  QueueTokenStatus.SEATED,
  QueueTokenStatus.CALLED,
  QueueTokenStatus.WAITING,
  QueueTokenStatus.WAITING,
  QueueTokenStatus.WAITING,
  QueueTokenStatus.WAITING,
  QueueTokenStatus.WAITING,
  QueueTokenStatus.WAITING,
  QueueTokenStatus.COMPLETED,
  QueueTokenStatus.COMPLETED,
  QueueTokenStatus.COMPLETED,
  QueueTokenStatus.SKIPPED,
];

const feedbackComments = [
  ['Loved the wood-fired pizza and the team was lovely.', 5, ['Great food', 'Friendly staff']],
  ['Quick service even during the evening rush.', 5, ['Fast service']],
  ['The brownie was the perfect finish to dinner.', 5, ['Great food']],
  ['Great ambience. Would love a few more vegan choices.', 4, ['Ambience', 'Menu suggestion']],
  ['Our order took a little longer, but the staff kept us updated.', 3, ['Wait time']],
  ['The paneer tikka was excellent. Coming back soon!', 5, ['Great food']],
  ['Easy to order from the table QR. Very convenient.', 5, ['Easy ordering']],
  ['Coffee was excellent; the cooler was a little too sweet.', 4, ['Great drinks']],
];

function localDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function fakePhone(index: number) {
  return `000000${String(index).padStart(4, '0')}`;
}

async function findOrCreateTable(
  businessId: string,
  branchId: string,
  name: string,
  capacity: number,
) {
  const existing = await prisma.table.findFirst({ where: { businessId, name } });
  if (existing) {
    return prisma.table.update({
      where: { id: existing.id },
      data: { branchId, capacity, isActive: true },
    });
  }
  return prisma.table.create({ data: { businessId, branchId, name, capacity } });
}

async function main() {
  if (process.env.ALLOW_LOCAL_MARKETING_SEED !== '1') {
    throw new Error('Set ALLOW_LOCAL_MARKETING_SEED=1 to confirm this local-only demo seed.');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  const database = new URL(databaseUrl);
  if (!['localhost', '127.0.0.1', '::1'].includes(database.hostname)) {
    throw new Error(`Refusing to seed a non-local database host: ${database.hostname}`);
  }

  const plan = await prisma.plan.findUnique({ where: { tier: PlanTier.ADVANCED } });
  if (!plan) throw new Error('Advanced plan is missing. Run the normal database seed first.');

  const passwordHash = await bcrypt.hash(ownerPassword, 12);
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { passwordHash, role: UserRole.OWNER, isActive: true },
    create: { email: ownerEmail, passwordHash, role: UserRole.OWNER, isActive: true },
  });

  const business = await prisma.business.upsert({
    where: { slug: businessSlug },
    update: {
      name: demoBusinessName,
      type: BusinessType.RESTAURANT,
      status: BusinessStatus.ACTIVE,
      phone: '0000000000',
      email: ownerEmail,
      address: '12 Church Street, Bengaluru, Karnataka',
      logoUrl: null,
      instagramHandle: 'copperkettlekitchen',
      timezone: 'Asia/Kolkata',
      currencyCode: 'INR',
    },
    create: {
      name: demoBusinessName,
      slug: businessSlug,
      type: BusinessType.RESTAURANT,
      status: BusinessStatus.ACTIVE,
      phone: '0000000000',
      email: ownerEmail,
      address: '12 Church Street, Bengaluru, Karnataka',
      logoUrl: null,
      instagramHandle: 'copperkettlekitchen',
      timezone: 'Asia/Kolkata',
      currencyCode: 'INR',
    },
  });

  const branch = await prisma.businessBranch.findFirst({
    where: { businessId: business.id, name: 'Indiranagar' },
  });
  const savedBranch = branch
    ? await prisma.businessBranch.update({
        where: { id: branch.id },
        data: { address: business.address, phone: business.phone, isActive: true },
      })
    : await prisma.businessBranch.create({
        data: {
          businessId: business.id,
          name: 'Indiranagar',
          address: business.address,
          phone: business.phone,
        },
      });

  await prisma.staff.upsert({
    where: { userId_businessId: { userId: owner.id, businessId: business.id } },
    update: { role: UserRole.OWNER, branchId: savedBranch.id, isActive: true },
    create: {
      userId: owner.id,
      businessId: business.id,
      branchId: savedBranch.id,
      role: UserRole.OWNER,
    },
  });

  const periodStart = new Date();
  const trialEnd = new Date(Date.now() + 30 * dayMs);
  await prisma.subscription.upsert({
    where: { businessId: business.id },
    update: {
      planId: plan.id,
      status: SubscriptionStatus.TRIALING,
      currentPeriodStart: periodStart,
      currentPeriodEnd: trialEnd,
      trialEndsAt: trialEnd,
    },
    create: {
      businessId: business.id,
      planId: plan.id,
      status: SubscriptionStatus.TRIALING,
      currentPeriodStart: periodStart,
      currentPeriodEnd: trialEnd,
      trialEndsAt: trialEnd,
    },
  });

  let menu = await prisma.menu.findFirst({ where: { businessId: business.id, isDefault: true } });
  if (menu) {
    menu = await prisma.menu.update({
      where: { id: menu.id },
      data: { name: 'Copper Kettle All-Day Menu', isActive: true },
    });
  } else {
    menu = await prisma.menu.create({
      data: { businessId: business.id, name: 'Copper Kettle All-Day Menu', isDefault: true },
    });
  }

  const savedItems: { id: string; name: string; price: number }[] = [];
  for (const [categoryIndex, categoryData] of categories.entries()) {
    let category = await prisma.menuCategory.findFirst({
      where: { menuId: menu.id, name: categoryData.name },
    });
    if (category) {
      category = await prisma.menuCategory.update({
        where: { id: category.id },
        data: { sortOrder: categoryIndex, isActive: true },
      });
    } else {
      category = await prisma.menuCategory.create({
        data: { menuId: menu.id, name: categoryData.name, sortOrder: categoryIndex },
      });
    }

    for (const [itemIndex, itemData] of categoryData.items.entries()) {
      const [name, price, isVeg, badge, description, imageUrl] = itemData as [
        string, number, boolean, string | null, string, string,
      ];
      const existing = await prisma.menuItem.findFirst({
        where: { categoryId: category.id, name },
      });
      const item = existing
        ? await prisma.menuItem.update({
            where: { id: existing.id },
            data: {
              price,
              isVeg,
              badge,
              description,
              imageUrl,
              prepTimeMinutes: 12 + (itemIndex % 3) * 4,
              taxRate: 5,
              sortOrder: itemIndex,
              isAvailable: true,
            },
          })
        : await prisma.menuItem.create({
            data: {
              categoryId: category.id,
              name,
              price,
              isVeg,
              badge,
              description,
              imageUrl,
              prepTimeMinutes: 12 + (itemIndex % 3) * 4,
              taxRate: 5,
              sortOrder: itemIndex,
              isAvailable: true,
            },
          });
      savedItems.push({ id: item.id, name: item.name, price: Number(item.price) });
    }
  }

  const tables = [];
  for (let index = 1; index <= 12; index += 1) {
    const table = await findOrCreateTable(
      business.id,
      savedBranch.id,
      `Table ${String(index).padStart(2, '0')}`,
      index <= 4 ? 2 : index <= 10 ? 4 : 6,
    );
    tables.push(table);
    await prisma.qRCode.upsert({
      where: { slug: `${businessSlug}-table-${index}` },
      update: {
        businessId: business.id,
        tableId: table.id,
        type: 'TABLE',
        targetUrl: `/r/${businessSlug}/table/${encodeURIComponent(table.name)}`,
        isActive: true,
      },
      create: {
        businessId: business.id,
        tableId: table.id,
        type: 'TABLE',
        slug: `${businessSlug}-table-${index}`,
        targetUrl: `/r/${businessSlug}/table/${encodeURIComponent(table.name)}`,
      },
    });
  }

  await prisma.qRCode.upsert({
    where: { slug: `${businessSlug}-entrance` },
    update: {
      businessId: business.id,
      type: 'ENTRANCE',
      targetUrl: `/r/${businessSlug}`,
      isActive: true,
    },
    create: {
      businessId: business.id,
      type: 'ENTRANCE',
      slug: `${businessSlug}-entrance`,
      targetUrl: `/r/${businessSlug}`,
    },
  });

  let queue = await prisma.queue.findFirst({
    where: { businessId: business.id, name: 'Walk-in & table waitlist' },
  });
  if (queue) {
    queue = await prisma.queue.update({
      where: { id: queue.id },
      data: {
        branchId: savedBranch.id,
        isOpen: true,
        isPaused: false,
        isArchived: false,
        remoteJoinEnabled: true,
        averageWaitMinutes: 8,
        arrivalGraceMinutes: 12,
      },
    });
  } else {
    queue = await prisma.queue.create({
      data: {
        businessId: business.id,
        branchId: savedBranch.id,
        name: 'Walk-in & table waitlist',
        serviceName: 'Dining',
        isOpen: true,
        remoteJoinEnabled: true,
        averageWaitMinutes: 8,
        arrivalGraceMinutes: 12,
      },
    });
  }

  const todayKey = localDateKey(new Date());
  await prisma.queue.update({
    where: { id: queue.id },
    data: { dailySequence: 24, lastSequenceDate: todayKey },
  });

  const customers = [];
  for (let index = 0; index < guestNames.length; index += 1) {
    const customer = await prisma.customer.upsert({
      where: { phone: fakePhone(index + 1) },
      update: { name: guestNames[index], isVerified: false },
      create: { phone: fakePhone(index + 1), name: guestNames[index], isVerified: false },
    });
    customers.push(customer);
    await prisma.customerBusiness.upsert({
      where: { customerId_businessId: { customerId: customer.id, businessId: business.id } },
      update: {
        visitCount: Math.max(1, (index % 6) + 1),
        totalSpend: 850 + index * 235,
        lastVisitAt: new Date(Date.now() - (index % 10) * dayMs),
        usualPartySize: 1 + (index % 5),
        favoriteItems: [savedItems[index % savedItems.length].name],
      },
      create: {
        customerId: customer.id,
        businessId: business.id,
        visitCount: Math.max(1, (index % 6) + 1),
        totalSpend: 850 + index * 235,
        lastVisitAt: new Date(Date.now() - (index % 10) * dayMs),
        usualPartySize: 1 + (index % 5),
        favoriteItems: [savedItems[index % savedItems.length].name],
      },
    });
  }

  const queueTokenIds: string[] = [];
  for (let index = 0; index < tokenStatuses.length; index += 1) {
    const status = tokenStatuses[index];
    const createdAt = new Date(Date.now() - (tokenStatuses.length - index) * 11 * 60 * 1000);
    const calledAt = [QueueTokenStatus.CALLED, QueueTokenStatus.SEATED, QueueTokenStatus.COMPLETED].includes(status)
      ? new Date(createdAt.getTime() + 3 * 60 * 1000)
      : null;
    const seatedAt = [QueueTokenStatus.SEATED, QueueTokenStatus.COMPLETED].includes(status)
      ? new Date(createdAt.getTime() + 12 * 60 * 1000)
      : null;
    const completedAt = status === QueueTokenStatus.COMPLETED
      ? new Date(createdAt.getTime() + 58 * 60 * 1000)
      : null;
    const token = await prisma.queueToken.upsert({
      where: {
        queueId_sequenceDate_tokenNumber: {
          queueId: queue.id,
          sequenceDate: todayKey,
          tokenNumber: index + 1,
        },
      },
      update: {
        customerId: customers[index % customers.length].id,
        customerName: guestNames[index],
        customerPhone: fakePhone(index + 1),
        partySize: 1 + (index % 5),
        status,
        source: index % 3 === 0 ? QueueEntrySource.WALK_IN : QueueEntrySource.REMOTE,
        estimatedWaitMin: index * 8,
        calledAt,
        seatedAt,
        completedAt,
        servedAt: completedAt,
        tableId: seatedAt ? tables[index % tables.length].id : null,
        sequenceDate: todayKey,
        notes: index % 4 === 0 ? 'Window seat if available' : null,
      },
      create: {
        queueId: queue.id,
        customerId: customers[index % customers.length].id,
        customerName: guestNames[index],
        customerPhone: fakePhone(index + 1),
        partySize: 1 + (index % 5),
        tokenNumber: index + 1,
        status,
        source: index % 3 === 0 ? QueueEntrySource.WALK_IN : QueueEntrySource.REMOTE,
        estimatedWaitMin: index * 8,
        calledAt,
        seatedAt,
        completedAt,
        servedAt: completedAt,
        tableId: seatedAt ? tables[index % tables.length].id : null,
        sequenceDate: todayKey,
        notes: index % 4 === 0 ? 'Window seat if available' : null,
        createdAt,
        updatedAt: createdAt,
      },
    });
    queueTokenIds.push(token.id);
  }

  const loyalty = await prisma.loyaltyProgram.upsert({
    where: { businessId: business.id },
    update: { type: LoyaltyProgramType.VISIT_STAMPS, stampsPerVisit: 1, stampsForReward: 8 },
    create: {
      businessId: business.id,
      type: LoyaltyProgramType.VISIT_STAMPS,
      stampsPerVisit: 1,
      stampsForReward: 8,
    },
  });

  for (let index = 0; index < 12; index += 1) {
    await prisma.loyaltyAccount.upsert({
      where: { programId_customerId: { programId: loyalty.id, customerId: customers[index].id } },
      update: { stamps: 2 + (index % 7), points: 240 + index * 35 },
      create: {
        programId: loyalty.id,
        customerId: customers[index].id,
        stamps: 2 + (index % 7),
        points: 240 + index * 35,
      },
    });
  }

  const reservations = [
    { name: 'Aarav Mehta', guests: 4, offsetHours: 1, status: ReservationStatus.CONFIRMED },
    { name: 'Sana Khan', guests: 2, offsetHours: 2, status: ReservationStatus.CONFIRMED },
    { name: 'Mira Joshi', guests: 6, offsetHours: 3, status: ReservationStatus.PENDING },
    { name: 'Dev Malhotra', guests: 3, offsetHours: 4, status: ReservationStatus.CONFIRMED },
  ];
  for (let index = 0; index < reservations.length; index += 1) {
    const reservation = reservations[index];
    const customer = customers[(index * 2) % customers.length];
    const existing = await prisma.reservation.findFirst({
      where: { businessId: business.id, customerName: reservation.name },
    });
    const data = {
      businessId: business.id,
      tableId: tables[index + 2].id,
      customerId: customer.id,
      customerName: reservation.name,
      customerPhone: customer.phone,
      guestCount: reservation.guests,
      scheduledAt: new Date(Date.now() + reservation.offsetHours * 60 * 60 * 1000),
      status: reservation.status,
      notes: index === 0 ? 'Birthday dinner' : null,
    };
    if (existing) {
      await prisma.reservation.update({ where: { id: existing.id }, data });
    } else {
      await prisma.reservation.create({ data });
    }
  }

  const feedbackRecords = [];
  for (let index = 0; index < feedbackComments.length; index += 1) {
    const [comment, rating, tags] = feedbackComments[index] as [string, number, string[]];
    const key = `qfast-marketing-feedback-${index + 1}`;
    const existing = await prisma.feedback.findUnique({ where: { dedupeKey: key } });
    const data = {
      businessId: business.id,
      customerId: customers[index].id,
      rating,
      tags,
      comment,
      wantsContact: rating < 4,
      status: index === 4 ? FeedbackStatus.ACKNOWLEDGED : index === 6 ? FeedbackStatus.RESOLVED : FeedbackStatus.NEW,
      dedupeKey: key,
      createdAt: new Date(Date.now() - index * 3 * 60 * 60 * 1000),
    };
    const feedback = existing
      ? await prisma.feedback.update({ where: { id: existing.id }, data })
      : await prisma.feedback.create({ data });
    feedbackRecords.push(feedback);
  }

  const orderSamples = [
    { status: OrderStatus.PREPARING, source: OrderSource.TABLE_QR, table: 0, items: [7, 16], daysAgo: 0 },
    { status: OrderStatus.PENDING, source: OrderSource.TABLE_QR, table: 1, items: [0, 15], daysAgo: 0 },
    { status: OrderStatus.ACCEPTED, source: OrderSource.TABLE_QR, table: 2, items: [4, 9], daysAgo: 0 },
    { status: OrderStatus.READY, source: OrderSource.QUEUE_PREORDER, table: 3, items: [10, 17], daysAgo: 0 },
    { status: OrderStatus.PREPARING, source: OrderSource.TAKEAWAY, table: 4, items: [5, 14], daysAgo: 0 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TABLE_QR, table: 5, items: [2, 12], daysAgo: 0 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TABLE_QR, table: 6, items: [6, 18], daysAgo: 0 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TAKEAWAY, table: 7, items: [1, 13], daysAgo: 0 },
    { status: OrderStatus.COMPLETED, source: OrderSource.QUEUE_PREORDER, table: 8, items: [3, 19], daysAgo: 1 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TABLE_QR, table: 9, items: [8, 11], daysAgo: 1 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TABLE_QR, table: 10, items: [0, 10], daysAgo: 2 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TAKEAWAY, table: 11, items: [4, 15], daysAgo: 3 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TABLE_QR, table: 1, items: [5, 18], daysAgo: 4 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TABLE_QR, table: 2, items: [9, 12], daysAgo: 5 },
    { status: OrderStatus.COMPLETED, source: OrderSource.QUEUE_PREORDER, table: 3, items: [6, 14], daysAgo: 6 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TAKEAWAY, table: 4, items: [3, 16], daysAgo: 7 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TABLE_QR, table: 5, items: [1, 11], daysAgo: 8 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TABLE_QR, table: 6, items: [7, 13], daysAgo: 9 },
    { status: OrderStatus.COMPLETED, source: OrderSource.QUEUE_PREORDER, table: 7, items: [2, 17], daysAgo: 10 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TABLE_QR, table: 8, items: [8, 19], daysAgo: 12 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TAKEAWAY, table: 9, items: [5, 10], daysAgo: 14 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TABLE_QR, table: 10, items: [4, 12], daysAgo: 18 },
    { status: OrderStatus.COMPLETED, source: OrderSource.TABLE_QR, table: 11, items: [2, 15], daysAgo: 22 },
    { status: OrderStatus.COMPLETED, source: OrderSource.QUEUE_PREORDER, table: 0, items: [7, 9], daysAgo: 26 },
  ];

  for (let index = 0; index < orderSamples.length; index += 1) {
    const sample = orderSamples[index];
    const customer = customers[index % customers.length];
    const itemLines = sample.items.map((itemIndex, lineIndex) => {
      const item = savedItems[itemIndex];
      const quantity = lineIndex === 0 && index % 4 === 0 ? 2 : 1;
      const lineTotal = item.price * quantity;
      return {
        menuItemId: item.id,
        quantity,
        unitPrice: item.price,
        totalPrice: lineTotal,
        status: sample.status,
        specialNote: lineIndex === 0 && index % 5 === 0 ? 'Light on chilli' : null,
      };
    });
    const subtotal = itemLines.reduce((sum, line) => sum + line.totalPrice, 0);
    const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
    const createdAt = new Date(Date.now() - sample.daysAgo * dayMs - (index % 5) * 42 * 60 * 1000);
    const orderKey = `qfast-marketing-order-${index + 1}`;
    const completed = sample.status === OrderStatus.COMPLETED;
    await prisma.order.upsert({
      where: { idempotencyKey: orderKey },
      update: {
        status: sample.status,
        updatedAt: createdAt,
      },
      create: {
        businessId: business.id,
        branchId: savedBranch.id,
        tableId: tables[sample.table].id,
        queueTokenId: sample.source === OrderSource.QUEUE_PREORDER ? queueTokenIds[index % 4] : null,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        source: sample.source,
        status: sample.status,
        subtotal,
        taxAmount,
        totalAmount: subtotal + taxAmount,
        idempotencyKey: orderKey,
        createdAt,
        updatedAt: createdAt,
        items: { create: itemLines },
        ...(completed
          ? {
              payments: {
                create: {
                  businessId: business.id,
                  amount: subtotal + taxAmount,
                  method: index % 2 === 0 ? PaymentMethod.UPI_AT_COUNTER : PaymentMethod.CASH,
                  status: PaymentStatus.PAID,
                  paidAt: new Date(createdAt.getTime() + 35 * 60 * 1000),
                },
              },
            }
          : {}),
      },
    });
  }

  console.log(`Marketing showcase ready: ${business.name} (${businessSlug})`);
  console.log(`Owner login: ${ownerEmail}`);
  console.log(`Owner password: ${ownerPassword}`);
  console.log(`Seeded ${savedItems.length} menu items, ${tables.length} tables, ${tokenStatuses.length} queue entries, ${orderSamples.length} orders, and ${feedbackRecords.length} reviews.`);
}

main()
  .catch((error) => {
    console.error('Marketing showcase seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
