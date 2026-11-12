import React from 'react';

type Props = { children: React.ReactNode; className?: string };

export function Card({ children, className = '' }: Props) {
  return <div className={`rounded-2xl border border-gray-200/80 bg-white shadow-soft ${className}`}>{children}</div>;
}
export function CardHeader({ children, className = '' }: Props) {
  return <div className={`border-b border-gray-100 px-5 py-4 sm:px-6 ${className}`}>{children}</div>;
}
export function CardContent({ children, className = '' }: Props) {
  return <div className={`px-5 py-4 sm:px-6 ${className}`}>{children}</div>;
}
export function CardFooter({ children, className = '' }: Props) {
  return <div className={`border-t border-gray-100 px-5 py-4 sm:px-6 ${className}`}>{children}</div>;
}
