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

/** A URL that opens Google's rating form, when the pasted link contains enough information. */
export function directReviewUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/search\.google\.com\/local\/writereview/i.test(trimmed)) return trimmed;

  const placeId = extractGooglePlaceId(trimmed);
  if (placeId && PLACE_ID.test(placeId)) return googleReviewLink(placeId);

  const listing = mapsListingUrl(trimmed);
  if (!listing) return null;
  try {
    const url = new URL(listing);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'g.page') {
      const path = url.pathname.replace(/\/$/, '');
      url.pathname = path.endsWith('/review') ? path : `${path}/review`;
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

/** Where the review button should go. A Place ID or g.page link opens the rating form. */
export function googleReviewTarget(input: string): { placeId: string; reviewUrl: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const extracted = extractGooglePlaceId(trimmed);
  const listing = mapsListingUrl(trimmed);
  const reviewUrl = directReviewUrl(trimmed) || (listing ?? (extracted ? googleReviewLink(extracted) : null));
  if (!reviewUrl) return null;
  return { placeId: extracted && PLACE_ID.test(extracted) ? extracted : trimmed, reviewUrl };
}

export function reviewFieldsFromInput(value?: string) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return { googlePlaceId: null as string | null, googleReviewUrl: null as string | null };

  const target = googleReviewTarget(trimmed);
  if (!target) {
    throw new BadRequestException('Paste the Google Maps link for your listing. A short maps.app.goo.gl link works.');
  }

  const placeId = target.placeId && PLACE_ID.test(target.placeId) ? target.placeId : trimmed;
  return { googlePlaceId: placeId, googleReviewUrl: directReviewUrl(trimmed) || target.reviewUrl };
}

/** Follow a short Maps link and keep the URL that opens the rating form. */
export async function reviewFieldsFromInputResolved(value?: string) {
  const fields = reviewFieldsFromInput(value);
  if (!fields?.googleReviewUrl) return fields;
  if (fields.googleReviewUrl.includes('writereview') || /g\.page\/.+\/review/i.test(fields.googleReviewUrl)) {
    return fields;
  }

  let current = fields.googleReviewUrl;
  try {
    for (let hop = 0; hop < 5; hop += 1) {
      const found = directReviewUrl(current);
      if (found?.includes('writereview') || /g\.page\/.+\/review/i.test(found || '')) {
        const placeId = extractGooglePlaceId(current) || extractGooglePlaceId(found);
        return {
          googlePlaceId: placeId && PLACE_ID.test(placeId) ? placeId : fields.googlePlaceId,
          googleReviewUrl: found,
        };
      }
      const response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(4000),
        headers: { 'User-Agent': 'QfastReviewLink' },
      });
      const location = response.headers.get('location');
      if (location && response.status >= 300 && response.status < 400) {
        current = new URL(location, current).toString();
        continue;
      }
      if (response.ok) {
        const text = (await response.text()).slice(0, 250_000);
        const placeId = extractGooglePlaceId(text);
        if (placeId && PLACE_ID.test(placeId)) {
          return { googlePlaceId: placeId, googleReviewUrl: googleReviewLink(placeId) };
        }
      }
      break;
    }
  } catch {
    return fields;
  }
  return fields;
}
