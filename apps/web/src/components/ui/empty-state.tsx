'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  emoji?: string;
  title: string;
  description: string;
  tip?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  tip,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`text-center py-12 px-6 rounded-3xl border border-dashed border-gray-200 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-16 h-16 rounded-3xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-4 shadow-xs text-2xl">
        {Icon ? <Icon className="w-8 h-8 text-orange-500" strokeWidth={1.8} /> : emoji || '✨'}
      </div>

      <h3 className="text-base font-extrabold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed mb-4">{description}</p>

      {tip && (
        <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl px-3.5 py-2 text-[11px] text-amber-900 max-w-xs mb-5 font-medium flex items-center gap-2">
          <span>💡</span>
          <span>{tip}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {actionLabel && (
          actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>{actionLabel}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>{actionLabel}</span>
            </button>
          )
        )}

        {secondaryActionLabel && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="inline-flex items-center text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition-colors"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
