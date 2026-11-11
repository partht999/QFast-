import { createHash, timingSafeEqual } from 'crypto';

export function secretsEqual(left: string, right: string) {
  const a = createHash('sha256').update(left).digest();
  const b = createHash('sha256').update(right).digest();
  return timingSafeEqual(a, b);
}

export type PartnerItem = { name: string; quantity: number; price: number };

export type PartnerOrderInput = {
  provider: 'SWIGGY' | 'ZOMATO';
  externalId: string;
  customerName?: string;
  items: PartnerItem[];
};

export function parsePartnerOrder(body: unknown): PartnerOrderInput {
  if (!body || typeof body !== 'object') throw new Error('Partner payload is invalid.');
  const record = body as Record<string, unknown>;
  if (record.provider !== 'SWIGGY' && record.provider !== 'ZOMATO') {
    throw new Error('provider must be SWIGGY or ZOMATO.');
  }
  const externalId = typeof record.externalId === 'string' ? record.externalId.trim() : '';
  if (!externalId || externalId.length > 80) throw new Error('externalId is required.');
  if (!Array.isArray(record.items) || record.items.length === 0 || record.items.length > 50) {
    throw new Error('Add between 1 and 50 items.');
  }
  const items = record.items.map((item) => parsePartnerItem(item));
  const customerName = typeof record.customerName === 'string' ? record.customerName.trim().slice(0, 80) : undefined;
  return { provider: record.provider, externalId, customerName, items };
}

export function partnerPayloadForStorage(order: PartnerOrderInput) {
  return {
    provider: order.provider,
    externalId: order.externalId,
    customerName: order.customerName || null,
    items: order.items.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price })),
  };
}

export function containsSecretKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSecretKey);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value as Record<string, unknown>).some(
    ([key, inner]) => key.toLowerCase().includes('secret') || containsSecretKey(inner),
  );
}

function parsePartnerItem(value: unknown): PartnerItem {
  if (!value || typeof value !== 'object') throw new Error('Each item needs a name, quantity, and price.');
  const item = value as Record<string, unknown>;
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  if (!name || name.length > 120) throw new Error('Each item needs a name from the menu.');
  const quantity = item.quantity;
  if (!Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 50) {
    throw new Error(`Quantity for ${name} must be a whole number from 1 to 50.`);
  }
  const price = Number(item.price);
  if (!Number.isFinite(price) || price < 0) throw new Error(`Price for ${name} is invalid.`);
  return { name, quantity: Number(quantity), price: Math.round(price * 100) / 100 };
}
