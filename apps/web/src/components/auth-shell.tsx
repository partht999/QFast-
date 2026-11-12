import { BrandMark } from './brand-mark';
import { QrCode, UtensilsCrossed, LayoutDashboard } from 'lucide-react';

const points = [
  { icon: QrCode, text: 'An entrance QR opens the queue in the browser.' },
  { icon: UtensilsCrossed, text: 'A table QR opens the menu for that table.' },
  { icon: LayoutDashboard, text: 'The staff board, kitchen, bills, and stamp cards stay in one workspace.' },
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,560px)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(249,115,22,0.2),transparent_50%)]" />
      <div className="bg-dots pointer-events-none absolute inset-0" />

      <section className="relative hidden flex-col justify-between px-12 py-12 text-white lg:flex">
        <BrandMark href="/" tone="light" label="Qfast home" />
        <div>
          <p className="ui-eyebrow-dark">Live customer flow</p>
          <h2 className="mt-4 max-w-lg text-4xl font-semibold leading-[1.15] tracking-tight">
            Customers follow their place. Staff call the next person.
          </h2>
          <ul className="mt-10 space-y-4">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-brand-300">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="pt-1">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-slate-400">The full product is free for 30 days.</p>
      </section>

      <section className="relative flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="reveal w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark href="/" tone="light" size="lg" label="Qfast home" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white p-6 shadow-2xl shadow-black/40 sm:p-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
