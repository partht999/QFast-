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

/** A Maps link the guest's browser can open. Short links have no Place ID inside them. */
export function mapsListingUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const short =
    host === 'maps.app.goo.gl' ||
    host === 'g.page' ||
    (host === 'goo.gl' && url.pathname.startsWith('/maps'));
  const maps =
    host === 'maps.google.com' ||
    ((host.endsWith('.google.com') || host.endsWith('.google.co.in') || host === 'google.com') &&
      url.pathname.startsWith('/maps'));
  const reviewForm = host === 'search.google.com' && url.pathname.startsWith('/local/');
  if (!short && !maps && !reviewForm) return null;
  return url.toString();
}

export function googleReviewLink(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

/** Where the review button should go. A real Place ID opens the review form. A Maps link opens that link. */
export function googleReviewTarget(input: string): { placeId: string; reviewUrl: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const extracted = extractGooglePlaceId(trimmed);
  if (extracted && PLACE_ID.test(extracted)) {
    return { placeId: extracted, reviewUrl: googleReviewLink(extracted) };
  }

  const listing = mapsListingUrl(trimmed);
  if (listing) return { placeId: trimmed, reviewUrl: listing };

  if (extracted) return { placeId: extracted, reviewUrl: googleReviewLink(extracted) };
  return null;
}

export function reviewHref(reviewUrl?: string | null, placeId?: string | null) {
  if (reviewUrl) return reviewUrl;
  if (!placeId) return '';
  return googleReviewTarget(placeId)?.reviewUrl || '';
}
