import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { NavigationProvider } from '@/components/navigation-memory';
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
    default: 'Qfast — Queues, table ordering, and stamp cards',
    template: '%s | Qfast',
  },
  description:
    'Qfast gives restaurants, cafes, salons, clinics, labs, and service desks a live queue. Guests join from a QR code. Restaurants can also take table orders, print a bill, and collect stamps.',
  openGraph: {
    title: 'Qfast — The wait should be obvious',
    description: 'A live queue for service businesses, with table ordering, bills, and stamp cards for restaurants and cafes.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased bg-white text-gray-900`}>
        <ToastProvider>
          <NavigationProvider>{children}</NavigationProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
