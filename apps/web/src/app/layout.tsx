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
    default: 'Qfast — Live queues for every service business',
    template: '%s | Qfast',
  },
  description:
    'Find a live queue or run one. Clinics, salons, diagnostic labs, service centres, and restaurants share one waitlist, QR check-in, and staff board.',
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
