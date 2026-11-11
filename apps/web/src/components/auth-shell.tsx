import { BrandMark } from './brand-mark';

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
    <main className="min-h-screen bg-slate-950 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,560px)]">
      <section className="hidden flex-col justify-between px-12 py-12 text-white lg:flex">
        <BrandMark href="/" tone="light" label="Qfast home" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">Live customer flow</p>
          <h2 className="mt-4 max-w-lg text-4xl font-black tracking-tight">Customers follow their place. Staff call the next person.</h2>
          <ul className="mt-8 space-y-3 text-sm leading-6 text-slate-300">
            <li>An entrance QR opens the queue in the browser.</li>
            <li>A table QR opens the menu for that table.</li>
            <li>The staff board, kitchen, bills, and stamp cards stay in one workspace.</li>
          </ul>
        </div>
        <p className="text-sm text-slate-400">The full product is free for 30 days.</p>
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark href="/" tone="light" size="lg" label="Qfast home" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
