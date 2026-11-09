import Link from 'next/link';
import { Zap } from 'lucide-react';

const sizes = {
  sm: { box: 'h-8 w-8 rounded-lg', icon: 'h-4 w-4', word: 'text-lg' },
  md: { box: 'h-9 w-9 rounded-xl', icon: 'h-5 w-5', word: 'text-xl' },
  lg: { box: 'h-10 w-10 rounded-xl', icon: 'h-5 w-5', word: 'text-2xl' },
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
  size?: keyof typeof sizes;
  showWordmark?: boolean;
  label?: string;
}) {
  const style = sizes[size];
  const wordColor = tone === 'light' ? 'text-white' : 'text-slate-950';

  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label={label}>
      <span className={`flex shrink-0 items-center justify-center bg-orange-500 text-white shadow-md shadow-orange-500/25 ${style.box}`}>
        <Zap className={style.icon} fill="currentColor" />
      </span>
      {showWordmark && (
        <span className={`${style.word} font-black tracking-tight ${wordColor}`}>Qfast</span>
      )}
    </Link>
  );
}
