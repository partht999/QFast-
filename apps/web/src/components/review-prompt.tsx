'use client';

export function ReviewPrompt({
  open,
  reviewUrl,
  stamps,
  goal,
  rewardName,
  onClose,
}: {
  open: boolean;
  reviewUrl?: string;
  stamps?: number;
  goal?: number;
  rewardName?: string;
  onClose: () => void;
}) {
  if (!open) return null;
  const full = typeof stamps === 'number' && typeof goal === 'number' && goal > 0 && stamps >= goal;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-wider text-orange-600">After your visit</p>
        <h2 className="mt-1 text-xl font-black text-neutral-950">How was it?</h2>
        {typeof stamps === 'number' && typeof goal === 'number' && goal > 0 && (
          <p className={`mt-3 rounded-2xl px-3 py-3 text-sm font-bold ${full ? 'bg-emerald-50 text-emerald-900' : 'bg-orange-50 text-orange-950'}`}>
            {full
              ? `Your card is full: ${stamps} of ${goal}. Show this phone at the counter and collect ${rewardName || 'your free dish'}.`
              : `You have ${stamps} of ${goal} stamps.`}
          </p>
        )}
        <div className="mt-4 grid gap-2">
          {reviewUrl ? (
            <a
              href={reviewUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-neutral-950 px-4 py-3 text-center text-sm font-bold text-white"
            >
              Rate us on Google
            </a>
          ) : (
            <p className="rounded-2xl bg-neutral-50 px-4 py-3 text-center text-sm text-neutral-600">
              This place has not added a Google review link yet.
            </p>
          )}
          <button type="button" onClick={onClose} className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-bold text-neutral-900">
            Send private feedback
          </button>
        </div>
      </div>
    </div>
  );
}
