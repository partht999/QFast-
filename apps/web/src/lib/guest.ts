export type GuestProfile = { name: string; phone: string };

function key(slug: string) {
  return `qfast_guest_${slug}`;
}

export function readGuest(slug: string): GuestProfile | null {
  if (typeof window === 'undefined' || !slug) return null;
  try {
    const raw = localStorage.getItem(key(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestProfile>;
    if (!parsed.name || !parsed.phone) return null;
    return { name: String(parsed.name), phone: String(parsed.phone) };
  } catch {
    return null;
  }
}

export function saveGuest(slug: string, guest: GuestProfile) {
  if (typeof window === 'undefined' || !slug || !guest.name || !guest.phone) return;
  localStorage.setItem(key(slug), JSON.stringify({ name: guest.name.trim(), phone: guest.phone.trim() }));
}
