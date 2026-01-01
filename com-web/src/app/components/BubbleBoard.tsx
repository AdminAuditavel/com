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
};

type CategoryBlock = {
  title: string;
  items: Bubble[];
};

const INITIAL_DATA: CategoryBlock[] = [
  {
    title: "ESPORTES",
    items: [
      { id: "flamengo", label: "Flamengo", state: "hot", size: "lg" },
      { id: "palmeiras", label: "Palmeiras", state: "hot", size: "md" },
      { id: "corinthians", label: "Corinthians", state: "steady", size: "md" },
      { id: "selecao", label: "Seleção Brasileira", state: "steady", size: "sm" },
      { id: "ufc", label: "UFC", state: "steady", size: "sm" },
      { id: "mcgregor", label: "McGregor", state: "cool", size: "sm" },
      { id: "futebol-mundial", label: "Futebol Mundial", state: "hot", size: "md" },
    ],
  },
  {
    title: "POLÍTICA",
    items: [
      { id: "presidencia", label: "Presidência", state: "hot", size: "md" },
      { id: "congresso", label: "Congresso", state: "steady", size: "sm" },
      { id: "stf", label: "STF", state: "hot", size: "sm" },
      { id: "eleicoes-2026", label: "Eleições 2026", state: "steady", size: "sm" },
      { id: "gastos-publicos", label: "Gastos Públicos", state: "steady", size: "sm" },
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

export default function BubbleBoard() {
  const [data, setData] = useState<CategoryBlock[]>(INITIAL_DATA);

  // refs dos botões (para saber o DOMRect de cada bolha)
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

  // Modal: guarda id e deriva estado atual do data (não “congela”)
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

  // ids por estado (para o FlowLayer)
  const hotIds = useMemo(() => {
    return data.flatMap((c) => c.items.filter((b) => b.state === "hot").map((b) => b.id));
  }, [data]);

  const coolIds = useMemo(() => {
    return data.flatMap((c) => c.items.filter((b) => b.state === "cool").map((b) => b.id));
  }, [data]);

  // pontos fixos (2 “infinitos”): inicializa no client e atualiza em resize
  const [origins, setOrigins] = useState(() => ({
    originA: { x: -40, y: 900 }, // placeholder, ajusta no effect
    originB: { x: 900, y: -40 },
  }));

  useEffect(() => {
    const update = () => {
      setOrigins({
        originA: { x: -40, y: window.innerHeight + 40 }, // canto inferior esquerdo “fora”
        originB: { x: window.innerWidth + 40, y: -40 },  // canto superior direito “fora”
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const allIds = useMemo(() => data.flatMap((c) => c.items.map((b) => b.id)), [data]);

  // Simulação do pulso (mantém o “vivo”)
  useEffect(() => {
    const t = window.setInterval(() => {
      const pick = allIds[Math.floor(Math.random() * allIds.length)];
      if (!pick) return;

      setData((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((b) => {
            if (b.id !== pick) return b;

            // ciclo: cool -> steady -> hot -> cool
            const nextState: Bubble["state"] =
              b.state === "cool" ? "steady" : b.state === "steady" ? "hot" : "cool";

            // ajuste leve no tamanho para dar sensação de pulso
            const nextSize: Bubble["size"] =
              nextState === "hot"
                ? b.size === "sm"
                  ? "md"
                  : "lg"
                : nextState === "cool"
                  ? b.size === "lg"
                    ? "md"
                    : "sm"
                  : b.size;

            return { ...b, state: nextState, size: nextSize };
          }),
        }))
      );
    }, 4500);

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
                      "bubble rounded-full border",
                      "flex flex-col items-center justify-center",
                      "shadow-sm active:scale-[0.98] transition",
                      "select-none",
                      b.state === "hot" && "bubble-hot animate-pulseSoft",
                      b.state === "steady" && "bubble-steady",
                      b.state === "cool" && "bubble-cool",
                      sizeClasses(b.size),
                    ]
                      .filter(Boolean)
                      .join(" ")}
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
