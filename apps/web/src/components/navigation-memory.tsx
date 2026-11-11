'use client';

import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const STORAGE_KEY = 'qfast_nav';

type NavigationContextValue = {
  previous: string | null;
  goBack: (fallback?: string) => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

function readStack(): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack.slice(-30)));
}

function currentLocation(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}

function NavigationTracker({ onChange }: { onChange: (previous: string | null) => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const path = currentLocation(pathname, searchParams.toString());
    const stack = readStack();
    if (stack.at(-1) !== path) {
      if (stack.length > 1 && stack.at(-2) === path) stack.pop();
      else stack.push(path);
      writeStack(stack);
    }
    onChange(stack.length > 1 ? stack[stack.length - 2] : null);
  }, [pathname, searchParams, onChange]);

  return null;
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [previous, setPrevious] = useState<string | null>(null);
  const previousRef = useRef<string | null>(null);
  previousRef.current = previous;
  const onChange = useCallback((value: string | null) => setPrevious(value), []);

  const goBack = useCallback((fallback?: string) => {
    if (previousRef.current) {
      router.back();
      return;
    }
    if (fallback) router.push(fallback);
  }, [router]);

  return (
    <NavigationContext.Provider value={{ previous, goBack }}>
      <Suspense fallback={null}>
        <NavigationTracker onChange={onChange} />
      </Suspense>
      {children}
    </NavigationContext.Provider>
  );
}

export function BackLink({
  fallback,
  label = 'Back',
  className = 'inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-slate-700 hover:text-slate-950',
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const navigation = useContext(NavigationContext);
  const [here, setHere] = useState('');

  useEffect(() => {
    setHere(`${window.location.pathname}${window.location.search}`);
  }, [navigation?.previous, fallback]);

  const previous = navigation?.previous && navigation.previous !== here ? navigation.previous : null;
  const destination = previous || (fallback && fallback !== here ? fallback : null);
  if (!destination || !navigation) return null;

  return (
    <button type="button" onClick={() => navigation.goBack(fallback)} className={className}>
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}

export function releaseOverlayHistory() {
  if (typeof window === 'undefined') return;
  if (window.history.state?.qfastOverlay) window.history.replaceState(null, '');
}

export function useOverlayHistory(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closedByHistory = useRef(false);

  useEffect(() => {
    if (!open) return;
    const urlAtOpen = window.location.href;
    window.history.pushState({ qfastOverlay: true }, '');
    const onPop = () => {
      closedByHistory.current = true;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (closedByHistory.current) {
        closedByHistory.current = false;
        return;
      }
      if (window.location.href !== urlAtOpen) return;
      if (window.history.state?.qfastOverlay) window.history.back();
    };
  }, [open]);
}
