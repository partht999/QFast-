import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = '', id, ...props }: InputProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-800">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs transition placeholder:text-gray-400 hover:border-gray-300 focus:outline-none focus:ring-4 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
            : 'border-gray-200 focus:border-brand-500 focus:ring-brand-500/15'
        } ${className}`}
        {...props}
      />
      {error && <p id={`${inputId}-error`} className="text-xs font-medium text-red-600">{error}</p>}
      {hint && !error && <p id={`${inputId}-hint`} className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
