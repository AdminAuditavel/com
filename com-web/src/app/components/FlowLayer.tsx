"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FlowParticle = {
  id: string;
  // CSS vars
  x0: string;
  y0: string;
  x1: string;
  y1: string;
  dur: string;
  color: string;
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function FlowLayer({
  originA,
  originB,
  getTargetRectById,
  hotIds,
  coolIds,
}: {
  // pontos fixos na tela (pixels)
  originA: { x: number; y: number };
  originB: { x: number; y: number };
  // dado um id de bolha, retorna o DOMRect dela (ou null)
  getTargetRectById: (id: string) => DOMRect | null;
  // bolhas em aquecimento: partículas A -> bolha
  hotIds: string[];
  // bolhas em esfriamento: partículas bolha -> B
  coolIds: string[];
}) {
  const [particles, setParticles] = useState<FlowParticle[]>([]);
  const timersRef = useRef<number[]>([]);

  const hotSet = useMemo(() => new Set(hotIds), [hotIds]);
  const coolSet = useMemo(() => new Set(coolIds), [coolIds]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      // decide se gera IN (hot) ou OUT (cool)
      const doHot = hotSet.size > 0 && (coolSet.size === 0 || Math.random() < 0.6);

      if (doHot) {
        const ids = Array.from(hotSet);
        const id = ids[Math.floor(Math.random() * ids.length)];
        const rect = getTargetRectById(id);
        if (!rect) return;

        // destino = centro da bolha
        const tx = rect.left + rect.width / 2;
        const ty = rect.top + rect.height / 2;

        const p: FlowParticle = {
          id: crypto.randomUUID(),
          x0: `${originA.x}px`,
          y0: `${originA.y}px`,
          x1: `${tx}px`,
          y1: `${ty}px`,
          dur: `${Math.round(rand(900, 1400))}ms`,
          color: "var(--hot-tx)",
        };

        setParticles((prev) => (prev.length > 40 ? prev.slice(-30).concat(p) : prev.concat(p)));

        const to = window.setTimeout(() => {
          setParticles((prev) => prev.filter((x) => x.id !== p.id));
        }, parseInt(p.dur, 10) + 100);
        timersRef.current.push(to);
      } else {
        const ids = Array.from(coolSet);
        const id = ids[Math.floor(Math.random() * ids.length)];
        const rect = getTargetRectById(id);
        if (!rect) return;

        // origem = centro da bolha
        const fx = rect.left + rect.width / 2;
        const fy = rect.top + rect.height / 2;

        const p: FlowParticle = {
          id: crypto.randomUUID(),
          x0: `${fx}px`,
          y0: `${fy}px`,
          x1: `${originB.x}px`,
          y1: `${originB.y}px`,
          dur: `${Math.round(rand(1000, 1600))}ms`,
          color: "var(--cool-tx)",
        };

        setParticles((prev) => (prev.length > 40 ? prev.slice(-30).concat(p) : prev.concat(p)));

        const to = window.setTimeout(() => {
          setParticles((prev) => prev.filter((x) => x.id !== p.id));
        }, parseInt(p.dur, 10) + 120);
        timersRef.current.push(to);
      }
    }, 420);

    return () => window.clearInterval(interval);
  }, [originA.x, originA.y, originB.x, originB.y, getTargetRectById, hotSet, coolSet]);

  return (
    <div className="flow-layer" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="flow-particle"
          style={
            {
              color: p.color,
              ["--x0" as any]: p.x0,
              ["--y0" as any]: p.y0,
              ["--x1" as any]: p.x1,
              ["--y1" as any]: p.y1,
              ["--dur" as any]: p.dur,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
