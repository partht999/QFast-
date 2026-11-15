/**
 * Display label for a table. Owners often name tables "Table 4" themselves
 * (the dashboard even suggests it), so only add the prefix when it is missing.
 * "4" -> "Table 4", "Table 4" -> "Table 4", "Patio 2" -> "Table Patio 2".
 */
export function tableLabel(name: string | number | null | undefined): string {
  const text = String(name ?? '').trim();
  if (!text) return 'Table';
  return /^table\b/i.test(text) ? text : `Table ${text}`;
}
