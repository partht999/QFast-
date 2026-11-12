import React from 'react';

export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 ${sizes[size]} ${className}`}
    />
  );
}
