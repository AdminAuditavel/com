//com-web/src/app/components/FlowLayer.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Target = { id: string; weight: number };

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
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pickWeighted(targets: Target[]): string | null {
  if (targets.length === 0) return null;
  let sum = 0;
  for (const t of targets) sum += Math.max(0, t.weight);

  if (sum <= 0) return targets[0]!.id;

  let r = Math.random() * sum;
  for (const t of targets) {
    r -= Math.max(0, t.weight);
    if (r <= 0) return t.id;
  }
  return targets[targets.length - 1]!.id;
}

/**
 * Mira na BORDA e entra 1/3 do raio:
 * - escolhe um ângulo aleatório
 * - calcula um ponto na borda do “círculo” (aprox: min(w,h)/2)
 * - puxa esse ponto para dentro (1/3 do raio)
 *
 * Para “feixe” mais claro, usamos jitter menor.
 */
function targetPointInsideBubble(rect: DOMRect) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const r = Math.min(rect.width, rect.height) / 2;
  const a = rand(0, Math.PI * 2);

  const bx = cx + Math.cos(a) * r;
  const by = cy + Math.sin(a) * r;

  const ix = bx + (cx - bx) * (1 / 3);
  const iy = by + (cy - by) * (1 / 3);

  return { x: ix + rand(-2, 2), y: iy + rand(-2, 2) };
}

/**
 * Origem “faixa” fora da tela (em vez de um ponto único):
 * cria um rio mais natural.
 */
function spawnFromBand(originA: { x: number; y: number }) {
  // banda no canto inferior-esquerdo: espalha um pouco em X e Y
  return {
    x: originA.x + rand(-30, 90),
    y: originA.y + rand(-90, 30),
  };
}

export default function FlowLayer({
  originA,
  originB,
  getTargetRectById,
  hotTargets,
  coolTargets,
  onImpact,
}: {
  originA: { x: number; y: number };
  originB: { x: number; y: number };
  getTargetRectById: (id: string) => DOMRect | null;
  hotTargets: Target[];
  coolTargets: Target[];
  onImpact: (id: string, delta: number) => void;
}) {
  const [particles, setParticles] = useState<FlowParticle[]>([]);
  const timersRef = useRef<number[]>([]);

  const hotList = useMemo(() => hotTargets, [hotTargets]);
  const coolList = useMemo(() => coolTargets, [coolTargets]);

  // Mobile: visível e performático
  const MAX_PARTICLES = 130;

  // PPS (agressivo o suficiente pra ficar óbvio)
  const BASE_PPS = 1.1;
  const HOT_PPS_PER_TARGET = 6.0;
  const COOL_PPS_PER_TARGET = 4.5;

  // bursts
  const BURST_CHANCE_PER_TICK = 0.22;
  const BURST_MIN = 2;
  const BURST_MAX = 7;

  // impacto
  const IN_DELTA = 0.02;
  const OUT_DELTA = -0.016;

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
        hotN * HOT_PPS_PER_TARGET + coolN * COOL_PPS_PER_TARGET
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

      // “feixe”: favorece IN quando há hot
      const total = hotN + coolN;
      const hotBias = total === 0 ? 0.5 : hotN / total;

      const newOnes: FlowParticle[] = [];

      for (let i = 0; i < toSpawn; i++) {
        const doHot =
          hotN > 0 &&
          (coolN === 0 || Math.random() < Math.max(0.35, Math.min(0.94, hotBias + 0.25)));

        if (doHot) {
          const id = pickWeighted(hotList);
          if (!id) continue;

          const rect = getTargetRectById(id);
          if (!rect) continue;

          const { x: tx, y: ty } = targetPointInsideBubble(rect);
          const start = spawnFromBand(originA);

          const durMs = Math.round(rand(520, 860));
          const p: FlowParticle = {
            id: crypto.randomUUID(),
            x0: `${start.x}px`,
            y0: `${start.y}px`,
            x1: `${tx}px`,
            y1: `${ty}px`,
            durMs,
            color: "var(--hot-tx)",
            sz: `${Math.round(rand(12, 18))}px`,
            rot: `${Math.round(rand(-18, 18))}deg`,
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
          const id = pickWeighted(coolList);
          if (!id) continue;

          const rect = getTargetRectById(id);
          if (!rect) continue;

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
            rot: `${Math.round(rand(-18, 18))}deg`,
          };

          newOnes.push(p);

          // drenagem ao sair
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
