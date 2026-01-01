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
  energy: number;
  trend: -1 | 0 | 1;
};

type CategoryBlock = {
  title: "ESPORTES" | "POLÍTICA";
  items: Bubble[];
};

const INITIAL_DATA: CategoryBlock[] = [
  {
    title: "ESPORTES",
    items: [
      { id: "flamengo", label: "Flamengo", state: "hot", size: "lg", energy: 0.82, trend: 1 },
      { id: "palmeiras", label: "Palmeiras", state: "hot", size: "md", energy: 0.68, trend: 1 },
      { id: "corinthians", label: "Corinthians", state: "steady", size: "md", energy: 0.52, trend: 0 },
      { id: "selecao", label: "Seleção Brasileira", state: "steady", size: "sm", energy: 0.46, trend: 0 },
      { id: "ufc", label: "UFC", state: "steady", size: "sm", energy: 0.48, trend: 0 },
      { id: "mcgregor", label: "McGregor", state: "cool", size: "sm", energy: 0.2, trend: -1 },
      { id: "futebol-mundial", label: "Futebol Mundial", state: "hot", size: "md", energy: 0.62, trend: 1 },
    ],
  },
  {
    title: "POLÍTICA",
    items: [
      { id: "presidencia", label: "Presidência", state: "hot", size: "md", energy: 0.72, trend: 1 },
      { id: "congresso", label: "Congresso", state: "steady", size: "sm", energy: 0.5, trend: 0 },
      { id: "stf", label: "STF", state: "hot", size: "sm", energy: 0.58, trend: 1 },
      { id: "eleicoes-2026", label: "Eleições 2026", state: "steady", size: "sm", energy: 0.52, trend: 0 },
      { id: "gastos-publicos", label: "Gastos Públicos", state: "steady", size: "sm", energy: 0.44, trend: -1 },
    ],
  },
];

type BubblePos = { x: number; y: number }; // percent

// Posições dentro de uma “área segura” (centro da bolha).
// Mantemos x/y longe das bordas porque a bolha cresce com --inflate.
const POSITIONS: Record<CategoryBlock["title"], Record<string, BubblePos>> = {
  ESPORTES: {
    flamengo: { x: 64, y: 30 },
    palmeiras: { x: 30, y: 28 },
    corinthians: { x: 48, y: 52 },
    selecao: { x: 24, y: 66 },
    ufc: { x: 74, y: 62 },
    mcgregor: { x: 58, y: 76 },
    "futebol-mundial": { x: 40, y: 74 },
  },
  POLÍTICA: {
    presidencia: { x: 58, y: 32 },
    stf: { x: 30, y: 42 },
    congresso: { x: 72, y: 52 },
    "eleicoes-2026": { x: 40, y: 66 },
    "gastos-publicos": { x: 60, y: 76 },
  },
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

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

  const [activeIndex, setActiveIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const goTo = useCallback((idx: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const w = el.clientWidth;
    el.scrollTo({ left: idx * w, behavior: "smooth" });
    setActiveIndex(idx);
  }, []);

  const onScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / w);
    if (idx !== activeIndex) setActiveIndex(idx);
  }, [activeIndex]);

  // refs para DOMRect
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

  // Modal
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

  const activeCat = data[activeIndex];

  const hotTargets = useMemo(() => {
    if (!activeCat) return [];
    return activeCat.items
      .filter((b) => b.state === "hot")
      .map((b) => ({ id: b.id, weight: Math.max(0.05, b.energy ** 2) }));
  }, [activeCat]);

  const coolTargets = useMemo(() => {
    if (!activeCat) return [];
    return activeCat.items
      .filter((b) => b.state === "cool")
      .map((b) => ({ id: b.id, weight: Math.max(0.05, b.energy ** 1.4) }));
  }, [activeCat]);

  // origins
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

  const onImpact = useCallback((id: string, delta: number) => {
    setData((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((b) => {
          if (b.id !== id) return b;
          const nextEnergy = clamp01(b.energy + delta);
          const trend: Bubble["trend"] = delta > 0 ? 1 : delta < 0 ? -1 : 0;
          return { ...b, energy: nextEnergy, trend };
        }),
      }))
    );
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setData((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((b) => {
            const baseline = b.state === "hot" ? 0.7 : b.state === "steady" ? 0.5 : 0.25;
            const nextEnergy = clamp01(b.energy + (baseline - b.energy) * 0.05);
            return { ...b, energy: nextEnergy };
          }),
        }))
      );
    }, 250);
    return () => window.clearInterval(t);
  }, []);

  // simulação de estado
  const allIds = useMemo(() => data.flatMap((c) => c.items.map((b) => b.id)), [data]);
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
            return { ...b, state: nextState };
          }),
        }))
      );
    }, 5200);
    return () => window.clearInterval(t);
  }, [allIds]);

  // “área segura” em percentuais (centro das bolhas)
  const SAFE_X_MIN = 18;
  const SAFE_X_MAX = 82;
  const SAFE_Y_MIN = 16;
  const SAFE_Y_MAX = 84;

  return (
    <>
      <FlowLayer
        originA={origins.originA}
        originB={origins.originB}
        getTargetRectById={getTargetRectById}
        hotTargets={hotTargets}
        coolTargets={coolTargets}
        onImpact={onImpact}
      />

      {/* Tabs */}
      <div className="sticky top-0 z-50 bg-white/85 backdrop-blur border-b border-gray-100">
        <div className="px-5 py-3">
          <div className="flex gap-2">
            {data.map((cat, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={cat.title}
                  type="button"
                  onClick={() => goTo(idx)}
                  className={[
                    "px-3 py-2 rounded-full text-xs font-semibold tracking-widest",
                    "transition border",
                    active
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  {cat.title}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pager */}
      <div
        ref={viewportRef}
        onScroll={onScroll}
        className={[
          "w-full overflow-x-auto",
          "snap-x snap-mandatory",
          "scroll-smooth",
          "[scrollbar-width:none] [-ms-overflow-style:none]",
        ].join(" ")}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div className="flex w-full">
          {data.map((cat) => (
            <section
              key={cat.title}
              className="w-full flex-none snap-center px-5 pb-10"
              style={{ minHeight: "calc(100vh - 72px)" }}
            >
              <div className="pt-4">
                <div
                  className="relative w-full"
                  style={{
                    // altura suficiente pra caber todas (ajuste fino mobile)
                    height: "calc(100vh - 140px)",
                    minHeight: 420,
                    maxHeight: 680,
                  }}
                >
                  {cat.items.map((b) => {
                    const raw = POSITIONS[cat.title][b.id] ?? { x: 50, y: 50 };
                    const pos = {
                      x: clamp(raw.x, SAFE_X_MIN, SAFE_X_MAX),
                      y: clamp(raw.y, SAFE_Y_MIN, SAFE_Y_MAX),
                    };

                    return (
                      <button
                        key={b.id}
                        ref={setBubbleEl(b.id)}
                        type="button"
                        className={[
                          "bubble absolute rounded-full border",
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
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            transform: "translate(-50%, -50%)",
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
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      <TopicModal open={isOpen} topic={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}
