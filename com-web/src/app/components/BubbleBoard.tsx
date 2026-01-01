// src/app/components/BubbleBoard.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import TrendTape from "@/app/components/TrendTape";

type Topic = {
  id: string;
  label: string;
  energy: number; // 0..1 (tamanho)
};

const TOPICS: Topic[] = [
  { id: "flamengo", label: "Flamengo", energy: 0.6 },
  { id: "palmeiras", label: "Palmeiras", energy: 0.5 },
  { id: "stf", label: "STF", energy: 0.45 },
  { id: "presidencia", label: "Presidência", energy: 0.55 },
  { id: "eleicoes-2026", label: "Eleições 2026", energy: 0.4 },
];

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export default function BubbleBoard() {
  const [topics, setTopics] = useState<Topic[]>(TOPICS);

  // índice do par atual
  const [pairIdx, setPairIdx] = useState(0);

  // escolhe 2 tópicos diferentes (um hot e um cool) alternando
  const pair = useMemo(() => {
    const hot = topics[pairIdx % topics.length];
    const cool = topics[(pairIdx + 1) % topics.length];
    return { hot, cool };
  }, [pairIdx, topics]);

  // “janela” de efeito: 1.5s (ajustável)
  useEffect(() => {
    const t = window.setInterval(() => {
      setPairIdx((i) => i + 1);
    }, 1500);
    return () => window.clearInterval(t);
  }, []);

  // durante a janela, hot sobe e cool desce gradualmente
  useEffect(() => {
    if (!pair.hot || !pair.cool) return;

    const STEP_MS = 90;
    const t = window.setInterval(() => {
      setTopics((prev) =>
        prev.map((it) => {
          if (it.id === pair.hot.id) return { ...it, energy: clamp01(it.energy + 0.018) };
          if (it.id === pair.cool.id) return { ...it, energy: clamp01(it.energy - 0.016) };
          // os demais relaxam lentamente para um baseline
          const baseline = 0.48;
          return { ...it, energy: clamp01(it.energy + (baseline - it.energy) * 0.05) };
        })
      );
    }, STEP_MS);

    return () => window.clearInterval(t);
  }, [pair.hot?.id, pair.cool?.id]);

  const hotEnergy = pair.hot?.energy ?? 0.6;
  const coolEnergy = pair.cool?.energy ?? 0.4;

  const hotScale = 1 + hotEnergy * 0.18;
  const coolScale = 1 + coolEnergy * 0.18;

  return (
    <section className="px-5 py-6">
      <div className="space-y-5">
        {/* HOT ROW */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="bubble bubble-hot w-28 h-28 rounded-full border flex flex-col items-center justify-center overflow-hidden"
              style={{ transform: `scale(${hotScale})` }}
            >
              <div className="font-semibold text-sm px-2 text-center leading-tight">
                {pair.hot?.label ?? "—"}
              </div>
              <div className="text-[10px] text-gray-600 mt-1">Aquecendo</div>
            </div>
          </div>

          <TrendTape direction="up" color="var(--hot-tx)" intensity={1.2} />
        </div>

        {/* COOL ROW */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="bubble bubble-cool w-28 h-28 rounded-full border flex flex-col items-center justify-center overflow-hidden"
              style={{ transform: `scale(${coolScale})` }}
            >
              <div className="font-semibold text-sm px-2 text-center leading-tight">
                {pair.cool?.label ?? "—"}
              </div>
              <div className="text-[10px] text-gray-600 mt-1">Esfriando</div>
            </div>
          </div>

          <TrendTape direction="down" color="var(--cool-tx)" intensity={1.0} />
        </div>
      </div>
    </section>
  );
}
