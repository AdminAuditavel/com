"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FlowParticle = {
  id: string;
  x0: string;
  y0: string;
  x1: string;
  y1: string;
  dur: string;
  color: string;

  // vars visuais opcionais (deixa menos “carimbado”)
  sz?: string;
  rot?: string;
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function FlowLayer({
  originA,
  originB,
  getTargetRectById,
  hotIds,
  coolIds,
}: {
  originA: { x: number; y: number };
  originB: { x: number; y: number };
  getTargetRectById: (id: string) => DOMRect | null;
  hotIds: string[];
  coolIds: string[];
}) {
  const [particles, setParticles] = useState<FlowParticle[]>([]);
  const timersRef = useRef<number[]>([]);

  const hotList = useMemo(() => [...hotIds], [hotIds]);
  const coolList = useMemo(() => [...coolIds], [coolIds]);

  // Ajuste fino (valores “bons” para parecer vivo sem derreter o celular)
  const MAX_PARTICLES = 140; // antes era ~40 (baixo demais para “causa”)
  const BASE_PPS = 0.6; // particles per second mínimos quando quase nada acontece
  const HOT_PPS_PER_BUBBLE = 2.4; // quanto cada hot adiciona ao fluxo
  const COOL_PPS_PER_BUBBLE = 2.0; // quanto cada cool adiciona ao fluxo

  // Bursts deixam o sistema parecer “organismo” (rajadas curtas)
  const BURST_CHANCE_PER_TICK = 0.12; // 12%
  const BURST_MIN = 2;
  const BURST_MAX = 5;

  // “acumulador” de emissões (para PPS virar partículas discretas)
  const carryRef = useRef(0);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    // tick mais rápido; emissão real é controlada por PPS (não “1 por tick”)
    const TICK_MS = 80;

    const interval = window.setInterval(() => {
      const hotN = hotList.length;
      const coolN = coolList.length;

      // Se não há nada hot/cool, praticamente para (mas não zera: mantém “vida”)
      const pps = Math.max(
        BASE_PPS,
        hotN * HOT_PPS_PER_BUBBLE + coolN * COOL_PPS_PER_BUBBLE
      );

      // Budget baseado em PPS e tick
      carryRef.current += (pps * TICK_MS) / 1000;

      // Burst: em momentos aleatórios, cria uma rajada extra (muito perceptível)
      let burstExtra = 0;
      if (Math.random() < BURST_CHANCE_PER_TICK && (hotN + coolN) > 0) {
        burstExtra = Math.floor(rand(BURST_MIN, BURST_MAX + 1));
      }

      let toSpawn = Math.floor(carryRef.current) + burstExtra;
      if (toSpawn <= 0) return;
      carryRef.current -= Math.floor(carryRef.current);

      // Respeita orçamento global (não cria se está lotado)
      const headroom = MAX_PARTICLES - particles.length;
      if (headroom <= 0) return;
      toSpawn = Math.min(toSpawn, headroom);

      // Ratio: mais hot => mais IN; mais cool => mais OUT
      const total = hotN + coolN;
      const hotBias = total === 0 ? 0.5 : hotN / total;

      const newOnes: FlowParticle[] = [];

      for (let i = 0; i < toSpawn; i++) {
        const doHot =
          hotN > 0 && (coolN === 0 || Math.random() < Math.max(0.25, Math.min(0.85, hotBias)));

        if (doHot) {
          const id = pickRandom(hotList);
          const rect = getTargetRectById(id);
          if (!rect) continue;

          // destino = centro da bolha (com jitter pra parecer “caindo dentro”)
          const tx = rect.left + rect.width / 2 + rand(-6, 6);
          const ty = rect.top + rect.height / 2 + rand(-6, 6);

          const durMs = Math.round(rand(650, 1050)); // mais rápido = “aquecendo”
          const p: FlowParticle = {
            id: crypto.randomUUID(),
            x0: `${originA.x}px`,
            y0: `${originA.y}px`,
            x1: `${tx}px`,
            y1: `${ty}px`,
            dur: `${durMs}ms`,
            color: "var(--hot-tx)",
            sz: `${Math.round(rand(11, 16))}px`,
            rot: `${Math.round(rand(-18, 18))}deg`,
          };

          newOnes.push(p);

          const to = window.setTimeout(() => {
            setParticles((prev) => prev.filter((x) => x.id !== p.id));
          }, durMs + 120);
          timersRef.current.push(to);
        } else {
          const id = pickRandom(coolList);
          const rect = getTargetRectById(id);
          if (!rect) continue;

          // origem = centro da bolha (com jitter pra parecer “vazando”)
          const fx = rect.left + rect.width / 2 + rand(-6, 6);
          const fy = rect.top + rect.height / 2 + rand(-6, 6);

          const durMs = Math.round(rand(900, 1500)); // mais lento = “esfriando/saindo”
          const p: FlowParticle = {
            id: crypto.randomUUID(),
            x0: `${fx}px`,
            y0: `${fy}px`,
            x1: `${originB.x}px`,
            y1: `${originB.y}px`,
            dur: `${durMs}ms`,
            color: "var(--cool-tx)",
            sz: `${Math.round(rand(11, 16))}px`,
            rot: `${Math.round(rand(-18, 18))}deg`,
          };

          newOnes.push(p);

          const to = window.setTimeout(() => {
            setParticles((prev) => prev.filter((x) => x.id !== p.id));
          }, durMs + 140);
          timersRef.current.push(to);
        }
      }

      if (newOnes.length === 0) return;

      // Mantém janela deslizante (evita crescimento infinito e dá prioridade ao “agora”)
      setParticles((prev) => {
        const merged = prev.concat(newOnes);
        if (merged.length <= MAX_PARTICLES) return merged;
        return merged.slice(merged.length - MAX_PARTICLES);
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originA.x, originA.y, originB.x, originB.y, getTargetRectById, hotList, coolList, particles.length]);

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
              ["--sz" as any]: p.sz ?? "14px",
              ["--rot" as any]: p.rot ?? "0deg",
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
