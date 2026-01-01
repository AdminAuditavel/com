// src/app/components/BubbleBoard.tsx

"use client";

import { useEffect, useRef, useState } from "react";

type Particle = {
  id: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  durMs: number;
  size: number;
  color: string;
  opacity: number;
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function BubbleParticles({
  getSourceRect,
  direction,
  colorVar,
  active,
}: {
  getSourceRect: () => DOMRect | null;
  direction: "up" | "down";
  colorVar: string; // ex "var(--hot-br)" ou "var(--cool-br)"
  active: boolean;
}) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const timersRef = useRef<number[]>([]);
  const carryRef = useRef(0);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!active) return;

    const TICK_MS = 80;
    const PPS = 16; // intensidade do efeito (pode ajustar)

    const interval = window.setInterval(() => {
      const rect = getSourceRect();
      if (!rect) return;

      carryRef.current += (PPS * TICK_MS) / 1000;
      let toSpawn = Math.floor(carryRef.current);
      carryRef.current -= toSpawn;

      toSpawn = Math.min(toSpawn, 4);

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const newOnes: Particle[] = [];

      for (let i = 0; i < toSpawn; i++) {
        const size = rand(6, 10);
        const durMs = Math.round(rand(700, 1200));

        const x0 = cx + rand(-rect.width * 0.25, rect.width * 0.25);
        const y0 = cy + rand(-rect.height * 0.15, rect.height * 0.15);

        // sobe ou desce ~120px a 200px
        const dy = direction === "up" ? -rand(120, 200) : rand(120, 200);
        const x1 = x0 + rand(-18, 18);
        const y1 = y0 + dy;

        const p: Particle = {
          id: crypto.randomUUID(),
          x0,
          y0,
          x1,
          y1,
          durMs,
          size,
          color: colorVar,
          opacity: rand(0.35, 0.85),
        };

        newOnes.push(p);

        const removeT = window.setTimeout(() => {
          setParticles((prev) => prev.filter((it) => it.id !== p.id));
        }, durMs + 60);
        timersRef.current.push(removeT);
      }

      setParticles((prev) => {
        const merged = prev.concat(newOnes);
        return merged.length <= 90 ? merged : merged.slice(merged.length - 90);
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [active, direction, colorVar, getSourceRect]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[55]" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          style={
            {
              position: "absolute",
              left: 0,
              top: 0,
              width: p.size,
              height: p.size,
              borderRadius: 999,
              background: `color-mix(in srgb, ${p.color} 35%, white)`,
              border: `1px solid color-mix(in srgb, ${p.color} 55%, transparent)`,
              opacity: p.opacity,
              transform: `translate(${p.x0}px, ${p.y0}px)`,
              animation: `bubbleParticleMove ${p.durMs}ms ease-out forwards`,
              ["--x1" as any]: `${p.x1}px`,
              ["--y1" as any]: `${p.y1}px`,
            } as React.CSSProperties
          }
        />
      ))}

      <style jsx>{`
        @keyframes bubbleParticleMove {
          from {
            transform: translate(var(--x0, 0px), var(--y0, 0px));
            opacity: 0;
          }
          15% {
            opacity: 0.9;
          }
          to {
            transform: translate(var(--x1), var(--y1));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
