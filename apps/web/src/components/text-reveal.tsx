'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Word-by-word blur/fade/rise reveal for the hero section of each marketing page.
 * Splits static text into word spans once, then reveals each block when it scrolls into view (once only).
 * Interactive widgets, buttons, forms and the nav are left untouched so React-managed live text keeps working.
 */
const TARGETS = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,dt,dd,figcaption,.eyebrow,.tag,[data-reveal-text]';
const SKIP = 'header,nav[aria-label="Main navigation"],form,button:not(.step),.btn,[class*="ui-btn"],.stage,.fphone,.marq,.sc-tabs,[data-no-reveal],svg,script,style,input,textarea,select';
const HERO = 'main > section:first-of-type, .qh .hero';
const STEP_MS = 32;
const MAX_DELAY_MS = 650;

function split(block: HTMLElement) {
  let i = 0;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || !node.nodeValue?.trim() || parent.closest(SKIP)) continue;
    // Gradient-clipped text breaks if its words become separate layers.
    if (getComputedStyle(parent).backgroundClip === 'text' || (getComputedStyle(parent) as CSSStyleDeclaration & { webkitBackgroundClip?: string }).webkitBackgroundClip === 'text') continue;

    const frag = document.createDocumentFragment();
    for (const part of node.nodeValue.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
      const w = document.createElement('span');
      w.className = 'wr-w';
      w.textContent = part;
      w.style.setProperty('--wr-d', `${Math.min(i * STEP_MS, MAX_DELAY_MS)}ms`);
      frag.appendChild(w);
      i += 1;
    }
    node.replaceWith(frag);
  }
  return i > 0;
}

export function TextReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('wr-in');
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });

    const run = () => {
      const roots = document.querySelectorAll<HTMLElement>(HERO);
      roots.forEach((root) => {
        root.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => {
          if (el.dataset.wr || el.closest(SKIP)) return;
          // Only the innermost text block, so nested targets are not split twice.
          if (el.querySelector(TARGETS)) return;
          el.dataset.wr = '1';
          if (!split(el)) return;
          el.classList.add('wr');
          io.observe(el);
        });
      });
    };

    const raf = requestAnimationFrame(run);
    // Fast jumps can skip past a block: reveal anything already above the fold.
    const sweep = () => document.querySelectorAll('.wr:not(.wr-in)').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add('wr-in'); io.unobserve(el); }
    });
    window.addEventListener('scroll', sweep, { passive: true });
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('scroll', sweep); };
  }, [pathname]);

  return null;
}
