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
  mode, // "in" = partículas entram no card; "out" = partículas saem
  colorVar,
  active,
  intensity = 14,
}: {
  getSourceRect: () => DOMRect | null;
  mode: "in" | "out";
  colorVar: string;
  active: boolean;
  intensity?: number; // partículas por segundo aprox
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

    const TICK_MS = 90;
    const PPS = intensity;

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
        const size = rand(8, 12);
        const durMs = Math.round(rand(720, 1100));

        if (mode === "out") {
          // nasce no centro e vai para fora
          const x0 = cx + rand(-rect.width * 0.12, rect.width * 0.12);
          const y0 = cy + rand(-rect.height * 0.12, rect.height * 0.12);

          const x1 = cx + rand(-rect.width * 0.9, rect.width * 0.9);
          const y1 = cy + rand(-220, 220);

          const p: Particle = {
            id: crypto.randomUUID(),
            x0,
            y0,
            x1,
            y1,
            durMs,
            size,
            color: colorVar,
            opacity: rand(0.35, 0.8),
          };
          newOnes.push(p);

          const removeT = window.setTimeout(() => {
            setParticles((prev) => prev.filter((it) => it.id !== p.id));
          }, durMs + 80);
          timersRef.current.push(removeT);
        } else {
          // mode === "in": nasce ao redor e vai para o centro
          const x0 = cx + rand(-rect.width * 0.9, rect.width * 0.9);
          const y0 = cy + rand(-220, 220);

          const x1 = cx + rand(-rect.width * 0.10, rect.width * 0.10);
          const y1 = cy + rand(-rect.height * 0.10, rect.height * 0.10);

          const p: Particle = {
            id: crypto.randomUUID(),
            x0,
            y0,
            x1,
            y1,
            durMs,
            size,
            color: colorVar,
            opacity: rand(0.4, 0.85),
          };
          newOnes.push(p);

          const removeT = window.setTimeout(() => {
            setParticles((prev) => prev.filter((it) => it.id !== p.id));
          }, durMs + 80);
          timersRef.current.push(removeT);
        }
      }

      setParticles((prev) => {
        const merged = prev.concat(newOnes);
        return merged.length <= 90 ? merged : merged.slice(merged.length - 90);
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [active, mode, colorVar, getSourceRect, intensity]);

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
              height: p.size * 0.8,
              borderRadius: 10,
              background: `color-mix(in srgb, ${p.color} 40%, white)`,
              border: `1px solid color-mix(in srgb, ${p.color} 55%, transparent)`,
              opacity: p.opacity,
              transform: `translate(${p.x0}px, ${p.y0}px)`,
              animation: `bubbleParticleMove ${p.durMs}ms ease-in-out forwards`,
              boxShadow: `0 2px 6px color-mix(in srgb, ${p.color} 30%, transparent)`,
            } as React.CSSProperties
          }
          aria-hidden="true"
        />
      ))}

      <style jsx>{`
        @keyframes bubbleParticleMove {
          from {
            transform: translate(var(--x0), var(--y0));
            opacity: 0.9;
          }
          to {
            transform: translate(var(--x1), var(--y1));
            opacity: 0;
          }
        }
        span {
          --x0: 0px;
          --y0: 0px;
          --x1: 0px;
          --y1: 0px;
        }
      `}</style>
    </div>
  );
}
