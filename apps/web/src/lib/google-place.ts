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

export function googleReviewLink(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}
