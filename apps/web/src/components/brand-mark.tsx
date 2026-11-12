import Link from 'next/link';

const heights = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
};

export function BrandMark({
  href = '/',
  tone = 'dark',
  size = 'md',
  showWordmark = true,
  label = 'Qfast',
}: {
  href?: string;
  tone?: 'dark' | 'light';
  size?: keyof typeof heights;
  showWordmark?: boolean;
  label?: string;
}) {
  const onDark = tone === 'light';

  return (
    <Link
      href={href}
      aria-label={label}
      className={`inline-flex shrink-0 items-center ${onDark ? 'rounded-lg bg-white px-1.5 py-1' : ''}`}
    >
      <img
        src={showWordmark ? '/qfast-logo.png' : '/qfast-mark.png'}
        alt=""
        className={`${heights[size]} w-auto max-w-none object-contain ${showWordmark ? '' : 'aspect-square'}`}
      />
    </Link>
  );
}

export function BrandLockup({
  href = '/',
  tone = 'dark',
  size = 'sm',
  venueName,
  venueLogoUrl,
}: {
  href?: string;
  tone?: 'dark' | 'light';
  size?: keyof typeof heights;
  venueName?: string | null;
  venueLogoUrl?: string | null;
}) {
  const onDark = tone === 'light';
  const hasVenue = Boolean(venueLogoUrl || venueName);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <BrandMark href={href} tone={tone} size={size} label="Qfast" />
      {hasVenue && <span className={`h-6 w-px shrink-0 ${onDark ? 'bg-neutral-700' : 'bg-neutral-200'}`} aria-hidden />}
      {venueLogoUrl ? (
        <img src={venueLogoUrl} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
      ) : null}
      {venueName ? (
        <span className={`truncate text-sm font-black ${onDark ? 'text-white' : 'text-neutral-950'}`}>{venueName}</span>
      ) : null}
    </div>
  );
}
