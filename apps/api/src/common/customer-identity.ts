import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizePhone, phoneLookupVariants } from './phone';

type CustomerRow = { id: string; phone: string; name?: string | null };

type CustomerDb = {
  customer: {
    findMany: (args: unknown) => Promise<CustomerRow[]>;
    update: (args: unknown) => Promise<CustomerRow>;
    create: (args: unknown) => Promise<CustomerRow>;
  };
};

export async function findCustomerByPhone(db: CustomerDb, rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  return chooseCustomer(db, phoneLookupVariants(phone), phone);
}

export async function resolveCustomer(db: CustomerDb, rawPhone: string, name?: string | null) {
  const phone = normalizePhone(rawPhone);
  const variants = phoneLookupVariants(phone);
  const chosen = await chooseCustomer(db, variants, phone);
  if (chosen) {
    const nextName = name?.trim();
    if (nextName && nextName !== chosen.name) {
      return db.customer.update({ where: { id: chosen.id }, data: { name: nextName } });
    }
    return chosen;
  }

  try {
    return await db.customer.create({
      data: { phone, name: name?.trim() || undefined },
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const again = await chooseCustomer(db, variants, phone);
    if (again) return again;
    throw error;
  }
}

async function chooseCustomer(db: CustomerDb, variants: string[], canonical: string) {
  const matches = await db.customer.findMany({ where: { phone: { in: variants } } });
  const exact = matches.find((row) => row.phone === canonical);
  if (exact) return exact;
  if (matches.length > 1) {
    throw new ConflictException(
      'This phone number matches more than one customer record. Those records were left unchanged.',
    );
  }
  return matches[0] || null;
}

export function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
