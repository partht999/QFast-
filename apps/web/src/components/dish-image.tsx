'use client';

import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

/**
 * Menu photo that falls back to a neutral placeholder when the URL is empty or
 * fails to load, so guests never see a broken-image icon.
 */
export function DishImage({ src, className = '' }: { src?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-neutral-100 text-neutral-300 ${className}`} aria-hidden="true">
        <UtensilsCrossed className="h-6 w-6" />
      </div>
    );
  }
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}
