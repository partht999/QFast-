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
      className={`text-center py-12 px-6 rounded-3xl border border-dashed border-gray-300/80 bg-gradient-to-b from-white to-gray-50/60 flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-16 h-16 rounded-3xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-4 shadow-soft text-2xl">
        {Icon ? <Icon className="w-8 h-8 text-orange-500" strokeWidth={1.8} /> : emoji || null}
      </div>

      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed mb-4">{description}</p>

      {tip && (
        <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl px-3.5 py-2 text-[11px] text-amber-900 max-w-xs mb-5 font-medium flex items-center gap-2">
          <span>{tip}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {actionLabel && (
          actionHref ? (
            <Link
              href={actionHref}
              className="ui-btn-primary"
            >
              <Plus className="w-4 h-4" />
              <span>{actionLabel}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="ui-btn-primary"
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
            className="ui-btn-secondary"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

