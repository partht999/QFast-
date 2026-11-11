export function selectionLabel(addons: unknown) {
  if (!addons || typeof addons !== 'object' || Array.isArray(addons)) return '';
  const snapshot = addons as {
    variant?: { name?: string } | null;
    selections?: Array<{ name?: string }>;
  };
  return [snapshot.variant?.name, ...(snapshot.selections || []).map((row) => row.name)]
    .filter(Boolean)
    .join(', ');
}

export function lineName(itemName: string | undefined, addons: unknown) {
  const extra = selectionLabel(addons);
  return [itemName || 'Item', extra].filter(Boolean).join(' · ');
}
