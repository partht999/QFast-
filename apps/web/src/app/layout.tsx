import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f97316',
};

export const metadata: Metadata = {
  title: {
    default: 'Qfast — Restaurant Operations',
    template: '%s | Qfast',
  },
  description:
    'Manage restaurant queues, table ordering, kitchen operations, loyalty, and guest feedback in one place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased bg-white text-gray-900`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
