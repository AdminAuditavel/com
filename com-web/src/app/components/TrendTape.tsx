"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TapeParticle = {
  id: string;
  // 0..1 (posição vertical inicial)
  y0: number;
  // 0..1 (posição vertical final)
  y1: number;
  durMs: number;
  x: number; // 0..1
  opacity: number;
  scale: number;
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function TrendTape({
  direction,
  color,
  intensity = 1,
}: {
  direction: "up" | "down";
  color: string; // ex: "var(--hot-tx)"
  intensity?: number; // 0.5..2
}) {
  const [items, setItems] = useState<TapeParticle[]>([]);
  const timersRef = useRef<number[]>([]);

  const config = useMemo(() => {
    const base = {
      max: 36, // cap
      tickMs: 90,
      pps: 14, // partículas por segundo (base)
      durMin: 700,
      durMax: 1200,
    };
    return {
      ...base,
      pps: Math.round(base.pps * intensity),
    };
  }, [intensity]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    let carry = 0;

    const interval = window.setInterval(() => {
      carry += (config.pps * config.tickMs) / 1000;

      let toSpawn = Math.floor(carry);
      carry -= toSpawn;

      if (toSpawn <= 0) return;

      const headroom = config.max - items.length;
      if (headroom <= 0) return;
      toSpawn = Math.min(toSpawn, headroom);

      const newOnes: TapeParticle[] = [];

      for (let i = 0; i < toSpawn; i++) {
        const durMs = Math.round(rand(config.durMin, config.durMax));
        const x = rand(0.15, 0.85);
        const opacity = rand(0.35, 0.8);
        const scale = rand(0.75, 1.15);

        const y0 = direction === "up" ? 1.06 : -0.06;
        const y1 = direction === "up" ? -0.06 : 1.06;

        const p: TapeParticle = {
          id: crypto.randomUUID(),
          y0,
          y1,
          durMs,
          x,
          opacity,
          scale,
        };

        newOnes.push(p);

        const removeT = window.setTimeout(() => {
          setItems((prev) => prev.filter((it) => it.id !== p.id));
        }, durMs + 80);
        timersRef.current.push(removeT);
      }

      setItems((prev) => {
        const merged = prev.concat(newOnes);
        return merged.length <= config.max ? merged : merged.slice(merged.length - config.max);
      });
    }, config.tickMs);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, direction, items.length]);

  return (
    <div className="relative w-[56px] h-[132px] rounded-xl border border-gray-200 bg-white/70 overflow-hidden">
      {/* linha central estilo “eixo” */}
      <div className="absolute left-1/2 top-2 bottom-2 w-px bg-gray-200" />

      {/* partículas */}
      {items.map((p) => (
        <span
          key={p.id}
          className="absolute left-0 top-0"
          style={
            {
              width: 10,
              height: 7,
              borderRadius: 999,
              border: `1px solid color-mix(in srgb, ${color} 55%, transparent)`,
              background: `color-mix(in srgb, ${color} 18%, transparent)`,
              opacity: p.opacity,

              transform: `translate(${p.x * 56}px, ${p.y0 * 132}px) scale(${p.scale})`,
              animation: `tapeMove-${direction} ${p.durMs}ms linear forwards`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* keyframes locais */}
      <style jsx>{`
        @keyframes tapeMove-up {
          from {
            transform: translate(var(--tx, 0px), calc(1.06 * 132px)) scale(var(--sc, 1));
          }
          to {
            transform: translate(var(--tx, 0px), calc(-0.06 * 132px)) scale(var(--sc, 1));
          }
        }
        @keyframes tapeMove-down {
          from {
            transform: translate(var(--tx, 0px), calc(-0.06 * 132px)) scale(var(--sc, 1));
          }
          to {
            transform: translate(var(--tx, 0px), calc(1.06 * 132px)) scale(var(--sc, 1));
          }
        }
      `}</style>

      {/* Hack: CSS variables por item (para não recriar keyframes) */}
      <style jsx>{`
        span {
          --tx: 0px;
          --sc: 1;
        }
      `}</style>
    </div>
  );
}
