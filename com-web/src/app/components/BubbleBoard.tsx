// src/app/components/BubbleBoard.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopicModal, { type TopicDetail } from "@/app/components/TopicModal";
import FlowLayer from "@/app/components/FlowLayer";

type Bubble = {
  id: string;
  label: string;
  state: "hot" | "steady" | "cool";
  size: "lg" | "md" | "sm";

  // NOVO: contínuo (0..1) para dar “vida”
  energy: number;

  // NOVO: -1 (caindo), 0 (neutro), 1 (subindo)
  trend: -1 | 0 | 1;
};

type CategoryBlock = {
  title: string;
  items: Bubble[];
};

const INITIAL_DATA: CategoryBlock[] = [
  {
    title: "ESPORTES",
    items: [
      { id: "flamengo", label: "Flamengo", state: "hot", size: "lg", energy: 0.9, trend: 1 },
      { id: "palmeiras", label: "Palmeiras", state: "hot", size: "md", energy: 0.78, trend: 1 },
      { id: "corinthians", label: "Corinthians", state: "steady", size: "md", energy: 0.58, trend: 0 },
      { id: "selecao", label: "Seleção Brasileira", state: "steady", size: "sm", energy: 0.5, trend: 0 },
      { id: "ufc", label: "UFC", state: "steady", size: "sm", energy: 0.52, trend: 0 },
      { id: "mcgregor", label: "McGregor", state: "cool", size: "sm", energy: 0.22, trend: -1 },
      { id: "futebol-mundial", label: "Futebol Mundial", state: "hot", size: "md", energy: 0.75, trend: 1 },
    ],
  },
  {
    title: "POLÍTICA",
    items: [
      { id: "presidencia", label: "Presidência", state: "hot", size: "md", energy: 0.82, trend: 1 },
      { id: "congresso", label: "Congresso", state: "steady", size: "sm", energy: 0.55, trend: 0 },
      { id: "stf", label: "STF", state: "hot", size: "sm", energy: 0.7, trend: 1 },
      { id: "eleicoes-2026", label: "Eleições 2026", state: "steady", size: "sm", energy: 0.6, trend: 0 },
      { id: "gastos-publicos", label: "Gastos Públicos", state: "steady", size: "sm", energy: 0.48, trend: -1 },
    ],
  },
];

function stateLabel(s: Bubble["state"]) {
  if (s === "hot") return "Aquecendo";
  if (s === "cool") return "Esfriando";
  return "Estável";
}

function sizeClasses(size: Bubble["size"]) {
  if (size === "lg") return "w-36 h-36 text-base";
  if (size === "md") return "w-28 h-28 text-sm";
  return "w-22 h-22 text-xs";
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export default function BubbleBoard() {
  const [data, setData] = useState<CategoryBlock[]>(INITIAL_DATA);

  const bubbleElsRef = useRef(new Map<string, HTMLButtonElement | null>());

  const setBubbleEl = useCallback((id: string) => {
    return (el: HTMLButtonElement | null) => {
      bubbleElsRef.current.set(id, el);
    };
  }, []);

  const getTargetRectById = useCallback((id: string) => {
    const el = bubbleElsRef.current.get(id);
    return el ? el.getBoundingClientRect() : null;
  }, []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isOpen = !!selectedId;

  const selected = useMemo<TopicDetail | null>(() => {
    if (!selectedId) return null;
    for (const cat of data) {
      const found = cat.items.find((b) => b.id === selectedId);
      if (found) return { id: found.id, label: found.label, state: found.state };
    }
    return null;
  }, [data, selectedId]);

  const hotIds = useMemo(() => {
    return data.flatMap((c) => c.items.filter((b) => b.state === "hot").map((b) => b.id));
  }, [data]);

  const coolIds = useMemo(() => {
    return data.flatMap((c) => c.items.filter((b) => b.state === "cool").map((b) => b.id));
  }, [data]);

  const [origins, setOrigins] = useState(() => ({
    originA: { x: -40, y: 900 },
    originB: { x: 900, y: -40 },
  }));

  useEffect(() => {
    const update = () => {
      setOrigins({
        originA: { x: -40, y: window.innerHeight + 40 },
        originB: { x: window.innerWidth + 40, y: -40 },
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const allIds = useMemo(() => data.flatMap((c) => c.items.map((b) => b.id)), [data]);

  // Simulação: agora altera energia e trend de forma contínua (mais “vivo”)
  useEffect(() => {
    const t = window.setInterval(() => {
      const pick = allIds[Math.floor(Math.random() * allIds.length)];
      if (!pick) return;

      setData((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((b) => {
            if (b.id !== pick) return b;

            const nextState: Bubble["state"] =
              b.state === "cool" ? "steady" : b.state === "steady" ? "hot" : "cool";

            // trend baseado na direção da mudança
            const trend: Bubble["trend"] =
              nextState === "hot" ? 1 : nextState === "cool" ? -1 : 0;

            // energia alvo por estado (com leve random para não ficar robótico)
            const baseTarget =
              nextState === "hot" ? 0.85 : nextState === "steady" ? 0.58 : 0.25;
            const target = clamp01(baseTarget + (Math.random() * 0.12 - 0.06));

            // smoothing: aproxima em passos (mais orgânico que “pular”)
            const nextEnergy = clamp01(b.energy + (target - b.energy) * 0.55);

            // mantém seu size (mas com menos “degrau”: só muda em hot/cool extremos)
            const nextSize: Bubble["size"] =
              nextState === "hot" && nextEnergy > 0.78
                ? b.size === "sm"
                  ? "md"
                  : "lg"
                : nextState === "cool" && nextEnergy < 0.32
                  ? b.size === "lg"
                    ? "md"
                    : "sm"
                  : b.size;

            return { ...b, state: nextState, size: nextSize, energy: nextEnergy, trend };
          }),
        }))
      );
    }, 2200); // mais frequente = tela mais “viva”

    return () => window.clearInterval(t);
  }, [allIds]);

  return (
    <>
      <FlowLayer
        originA={origins.originA}
        originB={origins.originB}
        getTargetRectById={getTargetRectById}
        hotIds={hotIds}
        coolIds={coolIds}
      />

      <section className="px-5 pb-10 space-y-10">
        {data.map((cat) => (
          <div key={cat.title}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold tracking-widest text-gray-500">
                {cat.title}
              </h2>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap gap-3">
                {cat.items.map((b) => (
                  <button
                    key={b.id}
                    ref={setBubbleEl(b.id)}
                    type="button"
                    className={[
                      "bubble relative rounded-full border",
                      "flex flex-col items-center justify-center",
                      "shadow-sm active:scale-[0.98] transition",
                      "select-none overflow-hidden",
                      b.state === "hot" && "bubble-hot",
                      b.state === "steady" && "bubble-steady",
                      b.state === "cool" && "bubble-cool",
                      b.trend === 1 && "bubble-rise",
                      b.trend === -1 && "bubble-fall",
                      sizeClasses(b.size),
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      {
                        // CSS variables (motor de “vida”)
                        ["--e" as any]: b.energy,
                        ["--t" as any]: b.trend,
                      } as React.CSSProperties
                    }
                    aria-label={`${b.label} — ${stateLabel(b.state)}`}
                    onClick={() => setSelectedId(b.id)}
                  >
                    <span className="relative z-10 font-medium leading-tight text-center px-2">
                      {b.label}
                    </span>
                    <span className="relative z-10 mt-1 text-[10px] text-gray-600">
                      {stateLabel(b.state)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      <TopicModal open={isOpen} topic={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}
