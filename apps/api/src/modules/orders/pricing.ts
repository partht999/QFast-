export function roundMoney(value: number) {
  if (!Number.isFinite(value)) throw new Error('Invalid amount');
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type PriceSnapshot = {
  variant: { id: string; name: string } | null;
  selections: Array<{ id: string; name: string; price: number }>;
};

export type PricedLine = {
  menuItemId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  addonsTotal: number;
  totalPrice: number;
  taxAmount: number;
  specialNote?: string;
  snapshot: PriceSnapshot;
};

type CatalogItem = {
  id: string;
  price: number;
  taxRate: number;
  variants: Array<{ id: string; price: number; name: string }>;
  addons: Array<{ id: string; price: number; name: string; maxSelect: number }>;
};

export function priceCatalogLine(
  catalog: CatalogItem,
  request: { quantity: number; variantId?: string; addonIds?: string[]; specialNote?: string },
): PricedLine {
  if (!Number.isInteger(request.quantity) || request.quantity < 1 || request.quantity > 50) {
    throw new Error('Item quantity must be between 1 and 50.');
  }
  assertNonNegative(catalog.price, 'Item price');
  assertNonNegative(catalog.taxRate, 'Tax rate');

  let unitPrice = catalog.price;
  let variant: PriceSnapshot['variant'] = null;
  if (request.variantId) {
    const match = catalog.variants.find((row) => row.id === request.variantId);
    if (!match) throw new Error('That option is not available for this dish.');
    assertNonNegative(match.price, 'Option price');
    unitPrice = match.price;
    variant = { id: match.id, name: match.name };
  }

  const addonIds = request.addonIds || [];
  if (new Set(addonIds).size !== addonIds.length) throw new Error('An add-on was selected twice.');
  const selections = addonIds.map((id) => {
    const addon = catalog.addons.find((row) => row.id === id);
    if (!addon) throw new Error('An add-on does not belong to this dish.');
    assertNonNegative(addon.price, 'Add-on price');
    if (addon.maxSelect < 1) throw new Error('That add-on cannot be selected.');
    return { id: addon.id, name: addon.name, price: addon.price };
  });
  const addonUnit = selections.reduce((sum, row) => sum + row.price, 0);
  const net = roundMoney((unitPrice + addonUnit) * request.quantity);
  const taxAmount = roundMoney(net * (catalog.taxRate / 100));
  return {
    menuItemId: catalog.id,
    variantId: variant?.id,
    quantity: request.quantity,
    unitPrice: roundMoney(unitPrice),
    addonsTotal: roundMoney(addonUnit * request.quantity),
    totalPrice: net,
    taxAmount,
    specialNote: request.specialNote,
    snapshot: { variant, selections },
  };
}

export function orderTotals(
  lines: Array<{ totalPrice: number; taxAmount: number }>,
  tipInput: number,
  previous?: { subtotal: number; tax: number; tip: number },
) {
  const added = lines.reduce((sum, line) => sum + line.totalPrice, 0);
  const addedTax = lines.reduce((sum, line) => sum + line.taxAmount, 0);
  const subtotal = roundMoney((previous?.subtotal || 0) + added);
  const taxAmount = roundMoney((previous?.tax || 0) + addedTax);
  const tipAmount = Math.min(subtotal, Math.max(0, (previous?.tip || 0) + Number(tipInput || 0)));
  if (!Number.isFinite(tipAmount)) throw new Error('Invalid tip');
  const totalAmount = roundMoney(subtotal + taxAmount + roundMoney(tipAmount));
  return { subtotal, taxAmount, tipAmount: roundMoney(tipAmount), totalAmount };
}

function assertNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} is invalid.`);
}
