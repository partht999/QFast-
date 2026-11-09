import { BadRequestException } from '@nestjs/common';

const PLACE_ID = /ChI[A-Za-z0-9_-]{10,}/;
const FEATURE_ID = /0x[0-9a-f]+:0x[0-9a-f]+/i;

function decoded(input: string) {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

export function extractGooglePlaceId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const text = `${decoded(raw)}\n${raw}`;

  const labeled = text.match(/(?:query_)?place_?id(?:=|:)([A-Za-z0-9_-]+)/i);
  if (labeled?.[1] && PLACE_ID.test(labeled[1])) return labeled[1];

  const fromData = text.match(/![12]s(ChI[A-Za-z0-9_-]{10,})/);
  if (fromData?.[1]) return fromData[1];

  const chij = text.match(PLACE_ID);
  if (chij) return chij[0];

  const feature = text.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
  if (feature?.[1]) return feature[1];

  if (FEATURE_ID.test(raw) && raw.length < 80) return raw;
  return null;
}

export function isShortGoogleMapsLink(input: string) {
  return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(input);
}

export async function resolveGooglePlaceId(input: string): Promise<string | null> {
  const direct = extractGooglePlaceId(input);
  if (direct) return direct;
  const trimmed = input.trim();
  if (!isShortGoogleMapsLink(trimmed)) return null;

  let current = trimmed;
  for (let hop = 0; hop < 5; hop += 1) {
    const response = await fetch(current, {
      redirect: 'manual',
      headers: { 'user-agent': 'Mozilla/5.0', accept: 'text/html' },
    });
    const location = response.headers.get('location');
    if (!location) return null;
    const next = new URL(location, current).toString();
    const found = extractGooglePlaceId(next);
    if (found) return found;
    current = next;
  }
  return extractGooglePlaceId(current);
}

export function googleReviewLink(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export async function placeIdFromInput(value?: string) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const placeId = await resolveGooglePlaceId(trimmed);
  if (!placeId) {
    throw new BadRequestException(
      'That Google Maps link does not include a Place ID. Open the listing and paste the full address-bar link.',
    );
  }
  return placeId;
}
