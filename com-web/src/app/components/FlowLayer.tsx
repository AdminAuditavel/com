//com-web/src/app/components/FlowLayer.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FlowParticle = {
  id: string;
  x0: string;
  y0: string;
  x1: string;
  y1: string;
  durMs: number;
  color: string;
  sz?: string;
  rot?: string;

  targetId?: string;
  impactDelta?: number;
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function deg(n: number) {
  return (n * Math.PI) / 180;
}

/**
 * Mira na BORDA e entra 1/3 do raio:
 * - escolhe um ângulo aleatório
 * - calcula um ponto na borda do “círculo” (aprox: min(w,h)/2)
 * - puxa esse ponto para dentro (1/3 do raio)
 */
function targetPointInsideBubble(rect: DOMRect) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // aproxima raio do círculo (usa o menor lado)
  const r = Math.min(rect.width, rect.height) / 2;

  // ângulo aleatório (com leve bias pra evitar ficar sempre “perfeito”)
  const a = deg(rand(0, 360));

  // ponto na borda
  const bx = cx + Math.cos(a) * r;
  const by = cy + Math.sin(a) * r;

  // entra 1/3 do raio em direção ao centro
  const ix = bx + (cx - bx) * (1 / 3);
  const iy = by + (cy - by) * (1 / 3);

  // jitter leve (sensação orgânica, mas sem “errar o alvo”)
  return { x: ix + rand(-3, 3), y: iy + rand(-3, 3) };
}

export default function FlowLayer({
  originA,
  originB,
  getTargetRectById,
  hotIds,
  coolIds,
  onImpact,
}: {
  originA: { x: number; y: number };
  originB: { x: number; y: number };
  getTargetRectById: (id: string) => DOMRect | null;
  hotIds: string[];
  coolIds: string[];
  onImpact: (id: string, delta: number) => void;
}) {
  const [particles, setParticles] = useState<FlowParticle[]>([]);
  const timersRef = useRef<number[]>([]);

  const hotList = useMemo(() => [...hotIds], [hotIds]);
  const coolList = useMemo(() => [...coolIds], [coolIds]);

  // Mobile: visível e performático
  const MAX_PARTICLES = 120;

  // PPS
  const BASE_PPS = 1.2;
  const HOT_PPS_PER_BUBBLE = 4.2;
  const COOL_PPS_PER_BUBBLE = 3.6;

  // bursts
  const BURST_CHANCE_PER_TICK = 0.18;
  const BURST_MIN = 2;
  const BURST_MAX = 6;

  // impacto (quanto enche/esvazia por “bolhinha”)
  const IN_DELTA = 0.018;
  const OUT_DELTA = -0.015;

  const carryRef = useRef(0);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const TICK_MS = 70;

    const interval = window.setInterval(() => {
      const hotN = hotList.length;
      const coolN = coolList.length;

      const pps = Math.max(
        BASE_PPS,
        hotN * HOT_PPS_PER_BUBBLE + coolN * COOL_PPS_PER_BUBBLE
      );

      carryRef.current += (pps * TICK_MS) / 1000;

      let burstExtra = 0;
      if (Math.random() < BURST_CHANCE_PER_TICK && hotN + coolN > 0) {
        burstExtra = Math.floor(rand(BURST_MIN, BURST_MAX + 1));
      }

      let toSpawn = Math.floor(carryRef.current) + burstExtra;
      if (toSpawn <= 0) return;
      carryRef.current -= Math.floor(carryRef.current);

      const headroom = MAX_PARTICLES - particles.length;
      if (headroom <= 0) return;
      toSpawn = Math.min(toSpawn, headroom);

      const total = hotN + coolN;
      const hotBias = total === 0 ? 0.5 : hotN / total;

      const newOnes: FlowParticle[] = [];

      for (let i = 0; i < toSpawn; i++) {
        const doHot =
          hotN > 0 &&
          (coolN === 0 || Math.random() < Math.max(0.25, Math.min(0.92, hotBias + 0.15)));

        if (doHot) {
          const id = pickRandom(hotList);
          const rect = getTargetRectById(id);
          if (!rect) continue;

          // alvo: borda -> entra 1/3 do raio
          const { x: tx, y: ty } = targetPointInsideBubble(rect);

          const durMs = Math.round(rand(620, 980));

          const p: FlowParticle = {
            id: crypto.randomUUID(),
            x0: `${originA.x}px`,
            y0: `${originA.y}px`,
            x1: `${tx}px`,
            y1: `${ty}px`,
            durMs,
            color: "var(--hot-tx)",
            sz: `${Math.round(rand(12, 18))}px`,
            rot: `${Math.round(rand(-22, 22))}deg`,
            targetId: id,
            impactDelta: IN_DELTA,
          };

          newOnes.push(p);

          const impactT = window.setTimeout(() => {
            onImpact(id, IN_DELTA);
          }, durMs);
          timersRef.current.push(impactT);

          const removeT = window.setTimeout(() => {
            setParticles((prev) => prev.filter((x) => x.id !== p.id));
          }, durMs + 140);
          timersRef.current.push(removeT);
        } else {
          const id = pickRandom(coolList);
          const rect = getTargetRectById(id);
          if (!rect) continue;

          // OUT: começa de dentro (1/3 do raio) e sai para originB
          const { x: fx, y: fy } = targetPointInsideBubble(rect);

          const durMs = Math.round(rand(820, 1450));

          const p: FlowParticle = {
            id: crypto.randomUUID(),
            x0: `${fx}px`,
            y0: `${fy}px`,
            x1: `${originB.x}px`,
            y1: `${originB.y}px`,
            durMs,
            color: "var(--cool-tx)",
            sz: `${Math.round(rand(12, 18))}px`,
            rot: `${Math.round(rand(-22, 22))}deg`,
            targetId: id,
            impactDelta: OUT_DELTA,
          };

          newOnes.push(p);

          // drenagem acontece ao sair (imediato)
          onImpact(id, OUT_DELTA);

          const removeT = window.setTimeout(() => {
            setParticles((prev) => prev.filter((x) => x.id !== p.id));
          }, durMs + 160);
          timersRef.current.push(removeT);
        }
      }

      if (newOnes.length === 0) return;

      setParticles((prev) => {
        const merged = prev.concat(newOnes);
        if (merged.length <= MAX_PARTICLES) return merged;
        return merged.slice(merged.length - MAX_PARTICLES);
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originA.x, originA.y, originB.x, originB.y, getTargetRectById, hotList, coolList, particles.length, onImpact]);

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
              ["--dur" as any]: `${p.durMs}ms`,
              ["--sz" as any]: p.sz ?? "14px",
              ["--rot" as any]: p.rot ?? "0deg",
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
