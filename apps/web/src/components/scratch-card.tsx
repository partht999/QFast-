'use client';

import { useState, useRef, useEffect, MouseEvent, TouchEvent } from 'react';
import { Sparkles, Gift, CheckCircle, ArrowRight, Trophy } from 'lucide-react';
import Link from 'next/link';

interface ScratchCardProps {
  points: number;
  rewardOffer?: string;
  businessName: string;
  businessSlug: string;
}

export function ScratchCard({
  points,
  rewardOffer = '15% OFF your next visit order!',
  businessName,
  businessSlug,
}: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScratched, setIsScratched] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions based on CSS display size
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    // Background gradient for silver/golden scratch layer
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f97316'); // Brand orange
    gradient.addColorStop(0.5, '#fb923c');
    gradient.addColorStop(1, '#ea580c');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add pattern / sparkles icon overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < width; i += 24) {
      for (let j = 0; j < height; j += 24) {
        ctx.beginPath();
        ctx.arc(i + 12, j + 12, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Call to action text on top of scratch surface
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ SCRATCH HERE ✨', width / 2, height / 2 - 10);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '500 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('Scratch to unlock loyalty reward', width / 2, height / 2 + 14);
  }, []);

  const handleScratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isScratched) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();

    // Calculate percent scratched periodically
    checkScratchProgress(ctx, canvas.width, canvas.height);
  };

  const checkScratchProgress = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      let transparentPixels = 0;
      const totalPixels = imgData.data.length / 4;

      // Sample every 16th pixel for high performance
      for (let i = 3; i < imgData.data.length; i += 16) {
        if (imgData.data[i] === 0) {
          transparentPixels += 4;
        }
      }

      const percent = Math.min(100, Math.round((transparentPixels / totalPixels) * 100));
      setScratchPercent(percent);

      if (percent > 45 && !isScratched) {
        setIsScratched(true);
        // Clean out remaining canvas
        ctx.clearRect(0, 0, width, height);
      }
    } catch {
      // Security/origin fallback
    }
  };

  // Mouse events
  const onMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    handleScratch(e.clientX, e.clientY);
  };

  const onMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    handleScratch(e.clientX, e.clientY);
  };

  const onMouseUp = () => {
    isDrawing.current = false;
  };

  // Touch events for mobile
  const onTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const touch = e.touches[0];
    if (touch) handleScratch(touch.clientX, touch.clientY);
  };

  const onTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const touch = e.touches[0];
    if (touch) handleScratch(touch.clientX, touch.clientY);
  };

  const onTouchEnd = () => {
    isDrawing.current = false;
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/20 p-5 shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Loyalty Scratch Card</h3>
            <p className="text-[11px] text-amber-800 font-medium">Earned with your order at {businessName}</p>
          </div>
        </div>
        <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-900">
          Exclusive Reward
        </span>
      </div>

      {/* The Container for Scratch Card and Hidden Reward */}
      <div className="relative mx-auto h-44 w-full select-none rounded-2xl bg-white shadow-inner flex flex-col items-center justify-center p-4 text-center overflow-hidden border border-amber-200">
        {/* REVEALED CONTENT (Underneath Canvas) */}
        <div className="flex flex-col items-center justify-center space-y-1.5 animate-in fade-in zoom-in duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-xs mb-1">
            <Gift className="h-6 w-6 animate-bounce" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600">You Unlocked</span>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            +{points} <span className="text-lg text-orange-600 font-extrabold">Points</span>
          </div>
          <p className="text-xs font-bold text-amber-900 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-200">
            {rewardOffer}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Valid on your next dine-in or takeaway visit to {businessName}!
          </p>
        </div>

        {/* SCRATCH CANVAS (On Top) */}
        {!isScratched && (
          <canvas
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="absolute inset-0 h-full w-full cursor-pointer touch-none transition-opacity duration-300"
          />
        )}
      </div>

      {/* Instructions & Next Visit Incentive */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <p className="text-xs text-slate-600 font-medium text-center sm:text-left">
          {isScratched ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
              <CheckCircle className="h-4 w-4" /> Reward unlocked! Show your phone on next visit.
            </span>
          ) : (
            'Swipe your finger or mouse across the card to scratch & reveal!'
          )}
        </p>

        <Link
          href={`/r/${businessSlug}/loyalty`}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
        >
          View Loyalty Wallet <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

