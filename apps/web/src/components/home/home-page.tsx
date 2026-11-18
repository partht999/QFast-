'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Plus_Jakarta_Sans } from 'next/font/google';
import {
  ArrowRight, BarChart3, Bell, Check, Clock3, ClipboardList, Coffee, Flag, FlaskConical, Frown,
  Headset, LayoutGrid, MessageSquareText, Play, QrCode, Receipt, Scissors, Settings, ShoppingBag,
  Smartphone, Star, Stethoscope, Users, UtensilsCrossed, Wrench, Zap,
} from 'lucide-react';
import './home.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-jakarta', display: 'swap' });

type Icon = typeof ArrowRight;

/* ---------- data (only features the product actually ships) ---------- */
export const industries: { label: string; href: string; icon: Icon; detail: string; colors: [string, string]; scene: string }[] = [
  { label: 'Restaurants', href: '/restaurants', icon: UtensilsCrossed, detail: 'Waitlist, table ordering, bills & stamp cards', colors: ['#7a2e0b', '#f59e0b'], scene: 'rest' },
  { label: 'Cafés', href: '/cafes', icon: Coffee, detail: 'Fast counter queue and table QR', colors: ['#4a2a17', '#c58b4e'], scene: 'cafe' },
  { label: 'Clinics', href: '/clinics', icon: Stethoscope, detail: 'One live queue, review after the visit', colors: ['#0e4f5c', '#5fc4c9'], scene: 'clinic' },
  { label: 'Salons', href: '/salons', icon: Scissors, detail: 'Walk-ins in arrival order', colors: ['#5b1a3d', '#e88aa8'], scene: 'salon' },
  { label: 'Diagnostics', href: '/diagnostics', icon: FlaskConical, detail: 'One queue for collection and imaging', colors: ['#1b2f6b', '#7aa7f0'], scene: 'lab' },
  { label: 'Service Centres', href: '/service-centres', icon: Wrench, detail: 'One queue for the counter', colors: ['#22283a', '#8892a8'], scene: 'svc' },
];

const scenes: Record<string, ReactNode> = {
  rest: (<><rect y="150" width="300" height="210" fill="rgba(0,0,0,.25)" /><g fill="rgba(255,230,180,.9)"><circle cx="60" cy="40" r="10" /><circle cx="150" cy="30" r="10" /><circle cx="240" cy="40" r="10" /></g><g stroke="rgba(255,240,210,.5)" strokeWidth="2"><path d="M60 0v30M150 0v20M240 0v30" /></g><g fill="rgba(255,255,255,.18)"><ellipse cx="90" cy="210" rx="60" ry="14" /><ellipse cx="220" cy="230" rx="60" ry="14" /></g><g fill="rgba(60,25,8,.6)"><rect x="40" y="170" width="16" height="40" rx="4" /><rect x="124" y="170" width="16" height="40" rx="4" /><rect x="170" y="190" width="16" height="40" rx="4" /><rect x="254" y="190" width="16" height="40" rx="4" /></g></>),
  cafe: (<><ellipse cx="150" cy="250" rx="120" ry="26" fill="rgba(255,255,255,.18)" /><path d="M80 150h140v50a60 60 0 0 1-60 60h-20a60 60 0 0 1-60-60z" fill="rgba(255,248,240,.92)" /><path d="M220 165h16a22 22 0 0 1 0 44h-18" fill="none" stroke="rgba(255,248,240,.92)" strokeWidth="10" /><ellipse cx="150" cy="152" rx="70" ry="12" fill="#6b3b1f" /><path d="M135 152c8-6 22-6 30 0-8 5-22 5-30 0z" fill="#e8c9a4" /><g fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="4" strokeLinecap="round"><path d="M125 120c0-14 12-14 12-28M160 120c0-14 12-14 12-28" /></g></>),
  clinic: (<><rect x="20" y="40" width="110" height="140" rx="6" fill="rgba(255,255,255,.22)" /><rect x="150" y="40" width="130" height="140" rx="6" fill="rgba(255,255,255,.14)" /><circle cx="210" cy="190" r="34" fill="#f1d3b6" /><path d="M150 360v-90a60 60 0 0 1 120 0v90z" fill="#fff" /><path d="M200 230v40" stroke="#5fc4c9" strokeWidth="6" /><circle cx="210" cy="285" r="10" fill="none" stroke="#1b2f6b" strokeWidth="4" /><path d="M60 230h30v-30h20v30h30v20h-30v30H90v-30H60z" fill="rgba(255,255,255,.9)" /></>),
  salon: (<><ellipse cx="150" cy="120" rx="70" ry="90" fill="rgba(255,255,255,.2)" stroke="rgba(255,230,240,.6)" strokeWidth="6" /><circle cx="150" cy="135" r="38" fill="#f0c7a6" /><path d="M108 130c0-40 22-62 42-62s44 22 44 62c-10-20-30-28-44-28s-32 8-42 28z" fill="#3b1a2a" /><path d="M90 360v-80a60 60 0 0 1 120 0v80z" fill="rgba(255,255,255,.85)" /><g stroke="#fff" strokeWidth="5" fill="none"><circle cx="250" cy="240" r="10" /><circle cx="250" cy="280" r="10" /><path d="M258 246l-36 30M258 274l-36-30" /></g></>),
  lab: (<><rect x="0" y="200" width="300" height="160" fill="rgba(255,255,255,.12)" /><path d="M70 90h40v10h-6v40l30 56a10 10 0 0 1-9 14H55a10 10 0 0 1-9-14l30-56v-40h-6z" fill="rgba(255,255,255,.88)" /><path d="M56 186h68l-10-18H66z" fill="#7aa7f0" /><rect x="170" y="110" width="90" height="90" rx="10" fill="rgba(255,255,255,.2)" /><path d="M180 160h18l8-20 12 40 10-26 8 6h14" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" /></>),
  svc: (<><rect x="0" y="230" width="300" height="130" fill="rgba(0,0,0,.25)" /><path d="M40 230l26-50h150l34 50z" fill="rgba(255,255,255,.85)" /><rect x="26" y="226" width="248" height="40" rx="14" fill="#e2e6ef" /><g fill="#22283a"><circle cx="80" cy="268" r="20" /><circle cx="220" cy="268" r="20" /></g><g fill="#8892a8"><circle cx="80" cy="268" r="8" /><circle cx="220" cy="268" r="8" /></g><path d="M86 186h56v40H74zM152 186h56l24 40h-80z" fill="rgba(130,170,230,.55)" /><g fill="rgba(255,255,255,.12)"><rect x="20" y="40" width="70" height="110" /><rect x="110" y="40" width="70" height="110" /><rect x="200" y="40" width="70" height="110" /></g></>),
};

const people = ['Aarav K.', 'Mary S.', 'Rahul M.', 'Priya S.', 'Vikram N.', 'Ananya R.', 'Farhan A.', 'Meera J.', 'Kabir D.', 'Sana T.', 'Rohan P.'];
const nm = (n: number) => people[n % people.length];

const steps = [
  { icon: QrCode, title: 'Scan QR Code', detail: 'Customer scans the QR at your entrance.' },
  { icon: Users, title: 'Join Queue', detail: 'They join from the browser. No app to install.' },
  { icon: Smartphone, title: 'Track Your Turn', detail: 'Token and place in line, live on their phone.' },
  { icon: Check, title: 'Get Served', detail: 'Notified on the page they already have open.' },
];

const faqs = [
  ['What is Qfast?', 'A live queue for service businesses. Customers join from a QR code in the browser, and your team calls the next person from one staff board. Restaurants and cafés also get table ordering, bills and stamp cards.'],
  ['Do customers need an app?', 'No. Everything runs in the phone browser after scanning your QR code.'],
  ['How does Qfast work?', 'Put a QR at the entrance. Customers join and see their token and place in line. Staff call, recall or complete visits with one tap.'],
  ['How does QR-based joining work?', 'Each business gets its own entrance QR. Scanning opens only your queue — there is no public directory of every business on Qfast.'],
  ['Which businesses can use Qfast?', 'Clinics, salons, diagnostic labs, service centres, restaurants and cafés.'],
  ['Can I manage queues from a dashboard?', 'Yes. Walk-ins and remote joins sit in one list on the staff board, in the order people joined.'],
  ['Is there a free trial?', 'Yes. The full product is free for 30 days.'],
  ['What happens after the trial?', 'The workspace asks you to subscribe before customers can join again. See the Pricing page for plans.'],
];

/* ---------- helpers ---------- */
function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.qh [data-reveal]'));
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const show = (el: Element) => { el.classList.add('in-view'); el.classList.remove('pre'); io.unobserve(el); };
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) show(e.target); }), { rootMargin: '0px 0px -60px 0px' });
    els.forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('pre'); io.observe(el); }
    });
    // Fast jumps (End key, anchor links) can skip past a section: reveal anything already above the fold.
    const sweep = () => document.querySelectorAll('.qh .pre').forEach((el) => { if (el.getBoundingClientRect().top < window.innerHeight) show(el); });
    window.addEventListener('scroll', sweep, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', sweep); };
  }, []);
}

function Eyebrow({ children, center }: { children: ReactNode; center?: boolean }) {
  return <span className={`eyebrow${center ? ' c' : ''}`}>{children}</span>;
}

/* ---------- hero dashboard demo (frontend-only simulation) ---------- */
function HeroDashboard() {
  const [cur, setCur] = useState(12);
  const [queue, setQueue] = useState([13, 14, 15, 16, 17]);
  const [nextNew, setNextNew] = useState(18);
  const [flip, setFlip] = useState(0);
  const [clock, setClock] = useState('');
  const devRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  const callNext = () => {
    if (!queue.length) return;
    const [head, ...rest] = queue;
    const grow = flip % 2 === 0;
    setCur(head);
    setQueue(grow ? [...rest, nextNew] : rest);
    if (grow) setNextNew(nextNew + 1);
    setFlip(flip + 1);
  };

  const onMove = (e: React.MouseEvent) => {
    const el = devRef.current;
    if (!el || window.innerWidth < 1040) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${-10 + x * 10}deg) rotateX(${4 - y * 8}deg) rotateZ(-1.5deg)`;
  };
  const onLeave = () => { if (devRef.current) devRef.current.style.transform = ''; };

  return (
    <div className="stage rv" style={{ animationDelay: '.15s' }} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="fl f1"><span className="fi"><Bell className="ic" /></span><span>Your turn is approaching!<small>Token {queue[0] ? `#${queue[0]}` : '—'} · get ready</small></span></div>
      <div className="fl f2"><span className="fi"><Users className="ic" /></span><span>{Math.max(0, queue.length - 1)} people ahead of you<small>Live on your phone</small></span></div>
      <div className="fl f3 g"><span className="fi"><Check className="ic" /></span><span>Token #{cur} is now<br />being served</span></div>
      <div className="device" ref={devRef}>
        <div className="scr" role="region" aria-label="Qfast staff board demo">
          <aside className="sb">
            <img src="/qfast-logo-dark.png" alt="" />
            {[['Dashboard', LayoutGrid], ['Queue', Users], ['Orders', ShoppingBag], ['Billing', Receipt], ['Reviews', Star], ['Settings', Settings]].map(([l, I], i) => {
              const Ico = I as Icon;
              return <span key={l as string} className={`sbl${i === 0 ? ' on' : ''}`}><Ico className="ic" />{l as string}</span>;
            })}
          </aside>
          <div className="mn">
            <div className="mh"><h4><i className="live-dot" />Live Queue</h4><small className="mono">{clock}</small></div>
            <div className="kp">
              <div><Users className="ic" /><b>{queue.length}</b><small>Waiting</small></div>
              <div><Clock3 className="ic" /><b>{Math.max(1, Math.round(queue.length * 0.8))} min</b><small>Avg. wait</small></div>
              <div className="srv"><small>Now serving</small><b>Token <span key={cur} className="tok flip">#{cur}</span></b><small>{nm(cur)} · {1 + (cur % 4)} guests</small></div>
            </div>
            <div className="ql">
              <div className="ql-h"><span>Queue list</span><span>{queue.length} in line</span></div>
              {queue.length ? queue.slice(0, 3).map((n, i) => (
                <div key={n} className={`qr-row${i === 0 ? ' nx' : ''}${i === 2 ? ' in' : ''}`}><b>#{n}</b><span>{nm(n)}</span><span className="st">{i === 0 ? 'Next' : 'Waiting'}</span></div>
              )) : <div className="qr-row"><span /><span>Queue is clear</span><span /></div>}
            </div>
            <button type="button" className="call" onClick={callNext} disabled={!queue.length}>Call Next <ArrowRight className="ic" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 4 steps ---------- */
function Steps() {
  const [k, setK] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setK((v) => (v + 1) % 4), 2600);
    return () => clearInterval(t);
  }, [auto]);
  return (
    <>
      <div className="steps">
        {steps.map((s, i) => {
          const Ico = s.icon;
          return (
            <button type="button" key={s.title} className={`step${i === k ? ' on' : ''}`} onMouseEnter={() => { setAuto(false); setK(i); }} onClick={() => { setAuto(false); setK(i); }}>
              <span className="num">{i + 1}</span><span className="si"><Ico className="ic" /></span><h3>{s.title}</h3><p>{s.detail}</p>
            </button>
          );
        })}
      </div>
      <div className="prog"><i style={{ width: `${(k + 1) * 25}%` }} /></div>
    </>
  );
}

/* ---------- feature tiles -> phone ---------- */
const PhoneBar = () => <div className="bar"><span>9:41</span><span>Qfast</span></div>;
const feats: { icon: Icon; label: string; screen: ReactNode }[] = [
  { icon: Users, label: 'Live Queue', screen: (<><PhoneBar /><h5>Your queue</h5><div className="ok"><Check className="ic" /></div><div className="big">Token #14</div><p style={{ textAlign: 'center', fontWeight: 700, fontSize: 13 }}>You&apos;re next!</p><div className="meter"><i style={{ width: '88%' }} /></div></>) },
  { icon: QrCode, label: 'QR Code Joining', screen: (<><PhoneBar /><h5>Join the queue</h5><div className="fld">Your name</div><div className="fld">Phone (optional)</div><div className="btn btn-p" style={{ padding: 10, fontSize: 13 }}>Join queue</div></>) },
  { icon: Bell, label: 'Turn Alerts', screen: (<><PhoneBar /><div className="fl" style={{ position: 'static', animation: 'none', whiteSpace: 'normal', marginTop: 20 }}><span className="fi"><Bell className="ic" /></span><span>You&apos;ve been called<small>Please come to the counter</small></span></div><div className="fl g" style={{ position: 'static', animation: 'none', whiteSpace: 'normal' }}><span className="fi"><Check className="ic" /></span><span>Visit complete<small>Thanks for waiting with us</small></span></div></>) },
  { icon: UtensilsCrossed, label: 'Table Ordering', screen: (<><PhoneBar /><h5>Menu · Table 6</h5>{['Paneer Tikka', 'Masala Dosa', 'Veg Biryani', 'Filter Coffee'].map((d) => <div key={d} className="mi"><span>{d}</span><i>+</i></div>)}<div className="btn btn-p" style={{ padding: 10, fontSize: 13 }}>Place order</div></>) },
  { icon: Receipt, label: 'Bills', screen: (<><PhoneBar /><h5>Your bill</h5>{['Paneer Tikka ×1', 'Masala Dosa ×2', 'Coffee ×2'].map((d) => <div key={d} className="mi"><span>{d}</span><span>₹ —</span></div>)}<div className="mi" style={{ fontWeight: 700, border: 0 }}><span>Total</span><span>₹ —</span></div><small style={{ color: '#8a90a6', fontSize: 10.5 }}>Amounts come from your menu</small></>) },
  { icon: Star, label: 'Stamp Cards', screen: (<><PhoneBar /><h5>Stamp card</h5><div className="stp">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < 6 ? 'on' : ''}>{i < 6 ? '★' : i === 9 ? '🎁' : ''}</i>)}</div><p style={{ fontSize: 12, color: '#5f6680' }}>6 of 10 stamps collected</p></>) },
  { icon: MessageSquareText, label: 'Google Reviews', screen: (<><PhoneBar /><h5>How was your visit?</h5><div style={{ fontSize: 26, color: '#f26a12', textAlign: 'center', letterSpacing: 2 }}>★★★★★</div><div className="btn btn-o" style={{ padding: 9, fontSize: 12 }}>Review on Google</div></>) },
  { icon: BarChart3, label: 'Staff Board', screen: (<><PhoneBar /><h5>Today</h5><div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 90 }}>{[40, 62, 50, 85, 70, 95, 60].map((h, i) => <i key={i} style={{ flex: 1, height: `${h}%`, background: 'linear-gradient(#ff8a3d,#f26a12)', borderRadius: '4px 4px 1px 1px' }} />)}</div><small style={{ color: '#8a90a6', fontSize: 10.5 }}>Illustrative</small></>) },
];

function Features() {
  const [k, setK] = useState(0);
  return (
    <div className="feat">
      <div className="fx">
        <Eyebrow>Powerful features</Eyebrow>
        <h2>Everything you need for a calmer <span>counter</span></h2>
        <p>From the queue to the bill to the review. Tap a feature to see it on the customer&apos;s phone.</p>
        <Link className="btn btn-p" href="/features">Explore features <ArrowRight className="ic" /></Link>
      </div>
      <div className="tiles">
        {feats.map((f, i) => {
          const Ico = f.icon;
          return <button type="button" key={f.label} className={`tile${i === k ? ' on' : ''}`} onClick={() => setK(i)}><span className="ti"><Ico className="ic" /></span>{f.label}</button>;
        })}
      </div>
      <div className="fphone"><div className="in" key={k}>{feats[k].screen}</div></div>
    </div>
  );
}

/* ---------- product showcase slider ---------- */
const slides = [
  { tab: 'Staff board', title: 'One board for the whole line.', copy: 'Walk-ins and remote joins land in one list, in the order people joined.', points: ['Call, recall or complete with one tap', 'Everyone sees the same line'], visual: 'board' },
  { tab: 'Customer view', title: 'The wait, right on their phone.', copy: 'Customers see their token and place in line on the page they opened from the QR.', points: ['No app install', 'They can step away from the door'], visual: 'phone' },
  { tab: 'Kitchen', title: 'Table orders straight to the kitchen.', copy: 'Restaurants and cafés take orders from the table QR and track them through the kitchen.', points: ['Orders grouped by table', 'Bill when the table is done'], visual: 'kitchen' },
];

function Showcase() {
  const [k, setK] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setK((v) => (v + 1) % slides.length), 6000);
    return () => clearTimeout(t);
  }, [k, paused]);
  return (
    <section className="sc" data-reveal>
      <div className="wrap">
        <div className="sc-h">
          <div><Eyebrow>Product tour</Eyebrow><h2 style={{ marginTop: 12 }}>See Qfast at work</h2></div>
          <div className="sc-tabs" role="tablist">
            {slides.map((s, i) => <button key={s.tab} role="tab" aria-selected={i === k} className={i === k ? 'on' : ''} onClick={() => setK(i)}>{s.tab}</button>)}
          </div>
        </div>
        <div className="sc-view" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <div className="sc-track" style={{ transform: `translateX(-${k * 100}%)` }}>
            {slides.map((s, i) => (
              <div className="sc-slide" key={s.tab} aria-hidden={i !== k}>
                <div>
                  <Eyebrow>{s.tab}</Eyebrow>
                  <h3>{s.title}</h3>
                  <p className="muted">{s.copy}</p>
                  <ul>{s.points.map((p) => <li key={p}><Check />{p}</li>)}</ul>
                </div>
                {s.visual === 'board' && (
                  <div className="sc-card">
                    <div className="mh"><h4><i className="live-dot" />General queue</h4><small>3 waiting</small></div>
                    {[['#12', 'Ananya Rao', 'Called'], ['#13', 'Imran Qureshi', 'Next'], ['#14', 'Meera Iyer', 'Waiting']].map(([t, n, b], j) => (
                      <div key={t} className={`qr-row${j === 1 ? ' nx' : ''}`}><b>{t}</b><span>{n}</span><span className="st">{b}</span></div>
                    ))}
                  </div>
                )}
                {s.visual === 'phone' && (
                  <div className="sc-card" style={{ maxWidth: 300, justifySelf: 'center', width: '100%' }}>
                    <small className="muted">Your token</small>
                    <div className="big" style={{ fontSize: 44 }}>#27</div>
                    <div className="meter"><i style={{ width: '64%' }} /></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}><span>3 ahead of you</span><span className="live-pill"><i className="live-dot" /> Live</span></div>
                  </div>
                )}
                {s.visual === 'kitchen' && (
                  <div className="sc-card">
                    <div className="kb">
                      <div><b>New</b><span>T4 · Masala Dosa ×2</span><span>T9 · Coffee ×3</span></div>
                      <div><b>Preparing</b><span>T6 · Paneer Tikka</span></div>
                      <div><b>Ready</b><span>T2 · Veg Biryani</span></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="sc-bar"><i key={`${k}-${paused}`} className={paused ? '' : 'run'} /></div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="acc">
      {faqs.map(([q, a], i) => (
        <div key={q} className={`qa${open === i ? ' open' : ''}`}>
          <button type="button" id={`faq-${i}`} aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{q}<span className="pm">+</span></button>
          <div className="ans"><div><p>{a}</p></div></div>
        </div>
      ))}
    </div>
  );
}

const qrBits = '111111101100000101101110101111010110111011010111010001111000111111101011010010110101111001010111001110101111111';
const shirts = ['#2a3352', '#5b6b8c', '#9a3412', '#3f6212', '#6b21a8', '#334155', '#b45309', '#1e40af', '#475569'];

export function HomePage() {
  useReveal();
  return (
    <div className={`qh ${jakarta.variable}`}>
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg">
          <svg viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true"><g className="wave" fill="none" strokeWidth="1.2">
            <path d="M0 420C160 300 300 520 480 360S760 240 800 300" stroke="#f26a12" opacity=".35" />
            <path d="M0 450C170 330 310 545 490 385S760 270 800 330" stroke="#f26a12" opacity=".25" />
            <path d="M0 480C180 360 320 570 500 410S760 300 800 360" stroke="#1b2a55" opacity=".18" />
            <path d="M0 510C190 390 330 595 510 435S760 330 800 390" stroke="#1b2a55" opacity=".12" />
          </g></svg>
        </div>
        <div className="wrap hero-g">
          <div className="rv">
            <span className="tag"><i />Live queues for clinics, salons, labs, service desks & restaurants</span>
            <h1>The wait should be obvious.<br /><span className="o">The crowd should not.<svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true"><path d="M3 14C80 4 200 2 297 10" fill="none" stroke="#f26a12" strokeWidth="5" strokeLinecap="round" /></svg></span></h1>
            <p className="lead">Qfast gives every customer a place in line and gives your team one board to call the next person. They join from a QR code. You stay in control of who is waiting.</p>
            <div className="cta">
              <Link className="btn btn-p sheen" href="/auth/register">Get Started <ArrowRight className="ic" /></Link>
              <a className="btn btn-w" href="#how-it-works"><span className="play"><Play /></span>Explore Qfast</a>
            </div>
            <div className="chips">
              {['No app for customers', 'Browser-based', '30-day free trial'].map((c) => <span key={c}><Check className="ic" />{c}</span>)}
            </div>
          </div>
          <HeroDashboard />
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marq" aria-hidden="true">
        <div className="marq-t">
          {[0, 1].map((r) => industries.map((ind) => { const Ico = ind.icon; return <span key={`${r}-${ind.label}`}><Ico size={18} />{ind.label}</span>; }))}
        </div>
      </div>

      {/* PROBLEM / SOLUTION */}
      <section className="ps" data-reveal>
        <div className="wrap ps-g">
          <div className="prob">
            <div>
              <Eyebrow>The problem</Eyebrow>
              <h2>Waiting feels worse when nobody can see the line.</h2>
              <p className="muted">People stand because they fear losing their place. Staff spend the rush answering &ldquo;how long?&rdquo; instead of doing the work.</p>
              <a className="btn btn-o" href="#how-it-works">See how Qfast helps <ArrowRight className="ic" /></a>
            </div>
            <div className="scene" aria-hidden="true">
              <span className="win" style={{ left: '6%' }} /><span className="win" style={{ left: '32%' }} />
              <span className="lamp" style={{ left: '22%' }} /><span className="lamp" style={{ left: '48%' }} />
              <span className="floor" />
              <div className="crowd">{Array.from({ length: 11 }, (_, i) => <i key={i} className="p" style={{ height: 66 + ((i * 37) % 30), background: shirts[i % shirts.length], animationDelay: `${-i * 0.4}s` }} />)}</div>
              <div className="pains">
                <div className="pain"><span className="fi"><Users className="ic" /></span>Crowded<br />waiting areas</div>
                <div className="pain"><span className="fi"><Headset className="ic" /></span>Staff<br />interruptions</div>
                <div className="pain"><span className="fi"><Frown className="ic" /></span>Customer<br />frustration</div>
              </div>
            </div>
          </div>
          <div className="sol">
            <div>
              <Eyebrow>The solution</Eyebrow>
              <h2>A smarter way to manage queues.</h2>
              <p className="muted">The line moves to the customer&apos;s phone. Your floor stays calm and the next name is never a guess.</p>
            </div>
            <div className="phone"><div className="in"><img src="/qfast-logo.png" alt="" /><div className="qrc">{Array.from({ length: 81 }, (_, i) => { const r = Math.floor(i / 9), c = i % 9; const fin = (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3); const on = fin ? !(r % 6 === 1 && c % 6 === 1) : qrBits[i] === '1'; return <i key={i} className={on ? '' : 'e'} />; })}</div><small>Scan to join queue</small></div></div>
            <svg className="arrow" viewBox="0 0 120 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M4 10c30 30 70 34 104 18M96 18l12 10-14 6" /></svg>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className="how" id="how-it-works" data-reveal>
        <div className="wrap">
          <Eyebrow center>How Qfast works</Eyebrow>
          <h2>A simple 4-step process</h2>
          <Steps />
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="ind" data-reveal>
        <div className="wrap">
          <div className="ind-h"><div><Eyebrow>Built for every industry</Eyebrow><h2>The same queue, shaped for your work</h2></div><Link href="/industries">Explore all <ArrowRight className="ic" /></Link></div>
          <div className="ig">
            {industries.map((ind) => {
              const Ico = ind.icon;
              return (
                <Link key={ind.label} className="icard" href={ind.href}>
                  <div className="art"><svg viewBox="0 0 300 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id={`g-${ind.scene}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={ind.colors[1]} /><stop offset="1" stopColor={ind.colors[0]} /></linearGradient></defs><rect width="300" height="360" fill={`url(#g-${ind.scene})`} />{scenes[ind.scene]}</svg></div>
                  <div className="ft"><span className="t"><Ico className="ic" />{ind.label}</span><span className="d">{ind.detail}</span></div>
                  <span className="go"><ArrowRight /></span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="feat-wrap" id="features" data-reveal>
        <div className="wrap"><Features /></div>
      </section>

      <Showcase />

      {/* TRIAL */}
      <section id="pricing" data-reveal>
        <div className="wrap">
          <div className="trial">
            <div className="gift" aria-hidden="true"><span className="bx" /><span className="lid" /><span className="rb" /><span className="bow" /></div>
            <div><span className="pill-o">30 days free</span><h3>Try the full product for 30 days.</h3><p>Run your real queue with every feature for your business type switched on.</p></div>
            <Link className="btn btn-d" href="/auth/register">Start free trial <ArrowRight className="ic" /></Link>
            <ul>{['Full product access', 'No app for customers', 'Print one QR to start'].map((t) => <li key={t}><Check className="ic" />{t}</li>)}</ul>
            <p className="after">After 30 days, a subscription keeps the queue open. <Link href="/pricing" style={{ color: 'var(--brand)', fontWeight: 600 }}>See plans →</Link></p>
          </div>
        </div>
      </section>

      {/* WHY + FAQ */}
      <section data-reveal>
        <div className="wrap wf">
          <div>
            <h3>Why choose Qfast?</h3>
            <div className="why">
              {[[Flag, 'Built for local businesses', 'Clinics, salons, labs, service desks and restaurants.'], [Zap, 'Easy to use', 'Call, recall or complete with one tap.'], [Smartphone, 'Mobile-friendly', 'Runs in any phone browser.'], [ClipboardList, 'One shared list', 'Walk-ins and remote joins together.']].map(([I, t, d]) => {
                const Ico = I as Icon;
                return <div className="w" key={t as string}><Ico className="ic" /><b>{t as string}</b><p>{d as string}</p></div>;
              })}
            </div>
          </div>
          <div><h3>Frequently asked questions</h3><Faq /></div>
        </div>
      </section>

      {/* CTA */}
      <section data-reveal>
        <div className="wrap">
          <div className="cta-b">
            <span className="glow" />
            <div className="bokeh">{Array.from({ length: 14 }, (_, i) => { const s = 10 + ((i * 13) % 34); return <i key={i} style={{ width: s, height: s, left: `${55 + ((i * 29) % 45)}%`, top: `${(i * 41) % 90}%`, opacity: 0.3 + (i % 4) * 0.15 }} />; })}</div>
            <div><h2>Your business deserves a better way to manage waiting.</h2><p>Make every wait simpler, smarter and more organised with Qfast.</p></div>
            <div className="bt"><Link className="btn btn-p sheen" href="/auth/register">Get Started <ArrowRight className="ic" /></Link><Link className="btn btn-ghost-d" href="/contact">Book a Demo</Link></div>
          </div>
        </div>
      </section>
    </div>
  );
}
