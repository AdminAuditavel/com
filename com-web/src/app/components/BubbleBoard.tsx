"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopicModal, { type TopicDetail } from "@/app/components/TopicModal";
import TrendChart from "@/app/components/TrendChart";
import BubbleParticles from "@/app/components/BubbleParticles";

type Bubble = {
  id: string;
  label: string;
  state: "hot" | "steady" | "cool";
  size: "lg" | "md" | "sm";
  energy: number; // 0..1
};

type CategoryBlock = {
  title: string;
  items: Bubble[];
};

const INITIAL_DATA: CategoryBlock[] = [
  {
    title: "ESPORTES",
    items: [
      { id: "flamengo", label: "Flamengo", state: "steady", size: "md", energy: 0.55 },
      { id: "palmeiras", label: "Palmeiras", state: "steady", size: "sm", energy: 0.48 },
      { id: "corinthians", label: "Corinthians", state: "steady", size: "sm", energy: 0.5 },
      { id: "selecao", label: "Seleção Brasileira", state: "steady", size: "sm", energy: 0.45 },
      { id: "ufc", label: "UFC", state: "steady", size: "sm", energy: 0.44 },
      { id: "mcgregor", label: "McGregor", state: "steady", size: "sm", energy: 0.35 },
      { id: "futebol-mundial", label: "Futebol Mundial", state: "steady", size: "sm", energy: 0.52 },
    ],
  },
  {
    title: "POLÍTICA",
    items: [
      { id: "presidencia", label: "Presidência", state: "steady", size: "md", energy: 0.56 },
      { id: "congresso", label: "Congresso", state: "steady", size: "sm", energy: 0.5 },
      { id: "stf", label: "STF", state: "steady", size: "sm", energy: 0.48 },
      { id: "eleicoes-2026", label: "Eleições 2026", state: "steady", size: "sm", energy: 0.5 },
      { id: "gastos-publicos", label: "Gastos Públicos", state: "steady", size: "sm", energy: 0.42 },
    ],
  },
];

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function sizeClasses(size: Bubble["size"]) {
  if (size === "lg") return "w-32 h-32 text-base";
  if (size === "md") return "w-24 h-24 text-sm";
  return "w-20 h-20 text-xs";
}

function asDetail(b: Bubble): TopicDetail {
  return { id: b.id, label: b.label, state: b.state };
}

function makeSeries(mode: "up" | "down" | "steady") {
  const pts: { t: number; v: number }[] = [];
  let v = mode === "up" ? 0.35 : mode === "down" ? 0.7 : 0.52;

  for (let i = 0; i <= 15; i++) {
    const drift =
      mode === "up" ? 0.018 : mode === "down" ? -0.018 : 0.0;

    v = clamp01(v + drift + (Math.random() * 0.06 - 0.03));

    // mantém “steady” mais contido
    if (mode === "steady") v = clamp01(v + (0.52 - v) * 0.25);

    pts.push({ t: i, v });
  }
  return pts;
}

export default function BubbleBoard() {
  const [data, setData] = useState<CategoryBlock[]>(INITIAL_DATA);

  // tabs/pager
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

  // modal
  const [selected, setSelected] = useState<TopicDetail | null>(null);

  // refs das bolhas em destaque (hot/cool para partículas)
  const hotRef = useRef<HTMLButtonElement | null>(null);
  const coolRef = useRef<HTMLButtonElement | null>(null);

  const activeCat = data[activeIndex];

  const CHANGE_MS = 3800;
  const [pairTick, setPairTick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setPairTick((x) => x + 1), CHANGE_MS);
    return () => window.clearInterval(t);
  }, []);

  const { hotBubble, coolBubble, steadyBubble } = useMemo(() => {
    const items = activeCat?.items ?? [];
    if (items.length < 3) return { hotBubble: items[0], coolBubble: items[1], steadyBubble: items[2] };

    return {
      hotBubble: items[pairTick % items.length],
      coolBubble: items[(pairTick + 1) % items.length],
      steadyBubble: items[(pairTick + 2) % items.length],
    };
  }, [activeCat, pairTick]);

  useEffect(() => {
    if (!activeCat || !hotBubble || !coolBubble || !steadyBubble) return;

    const STEP_MS = 120;
    const t = window.setInterval(() => {
      setData((prev) =>
        prev.map((cat, idx) => {
          if (idx !== activeIndex) return cat;

          return {
            ...cat,
            items: cat.items.map((b) => {
              if (b.id === hotBubble.id) {
                return { ...b, state: "hot", energy: clamp01(b.energy + 0.014), size: "md" };
              }
              if (b.id === coolBubble.id) {
                return { ...b, state: "cool", energy: clamp01(b.energy - 0.011), size: "sm" };
              }
              if (b.id === steadyBubble.id) {
                const baseline = 0.52;
                return {
                  ...b,
                  state: "steady",
                  energy: clamp01(b.energy + (baseline - b.energy) * 0.06),
                  size: "sm",
                };
              }
              const baseline = 0.5;
              return { ...b, state: "steady", energy: clamp01(b.energy + (baseline - b.energy) * 0.03) };
            }),
          };
        })
      );
    }, STEP_MS);

    return () => window.clearInterval(t);
  }, [activeCat, activeIndex, hotBubble?.id, coolBubble?.id, steadyBubble?.id]);

  // séries mudam junto com o par (para o label mostrar o nome certo)
  const hotSeries = useMemo(() => makeSeries("up"), [pairTick, activeIndex]);
  const coolSeries = useMemo(() => makeSeries("down"), [pairTick, activeIndex]);
  const steadySeries = useMemo(() => makeSeries("steady"), [pairTick, activeIndex]);

  const getHotRect = useCallback(() => hotRef.current?.getBoundingClientRect() ?? null, []);
  const getCoolRect = useCallback(() => coolRef.current?.getBoundingClientRect() ?? null, []);

  return (
    <>
      <BubbleParticles active={!!hotBubble} direction="up" colorVar="var(--hot-br)" getSourceRect={getHotRect} />
      <BubbleParticles active={!!coolBubble} direction="down" colorVar="var(--cool-br)" getSourceRect={getCoolRect} />

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
                  onClick={() => {
                    goTo(idx);
                    setPairTick(0);
                  }}
                  className={[
                    "px-3 py-2 rounded-full text-xs font-semibold tracking-widest",
                    "transition border",
                    active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200",
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

      {/* Pager horizontal */}
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
          {data.map((cat) => {
            const items = cat.items;
            const isActive = cat.title === activeCat?.title;

            const hot = isActive ? hotBubble : items[0];
            const cool = isActive ? coolBubble : items[1];
            const steady = isActive ? steadyBubble : items[2];

            return (
              <section key={cat.title} className="w-full flex-none snap-center px-5 pb-8" style={{ minHeight: "calc(100dvh - 72px)" }}>
                <div className="pt-6 flex flex-col gap-5">
                  {/* 3 bolhas principais */}
                  <div className="flex justify-center gap-4">
                    <button
                      ref={isActive ? hotRef : undefined}
                      type="button"
                      onClick={() => hot && setSelected(asDetail(hot))}
                      className="bubble bubble-hot rounded-full border overflow-hidden flex flex-col items-center justify-center w-24 h-24"
                      style={{ ["--e" as any]: hot?.energy ?? 0.6 }}
                    >
                      <div className="font-semibold text-[13px] px-2 text-center leading-tight">{hot?.label ?? "—"}</div>
                      <div className="text-[10px] text-gray-600 mt-1">Quente</div>
                    </button>

                    <button
                      ref={isActive ? coolRef : undefined}
                      type="button"
                      onClick={() => cool && setSelected(asDetail(cool))}
                      className="bubble bubble-cool rounded-full border overflow-hidden flex flex-col items-center justify-center w-24 h-24"
                      style={{ ["--e" as any]: cool?.energy ?? 0.4 }}
                    >
                      <div className="font-semibold text-[13px] px-2 text-center leading-tight">{cool?.label ?? "—"}</div>
                      <div className="text-[10px] text-gray-600 mt-1">Frio</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => steady && setSelected(asDetail(steady))}
                      className="bubble bubble-steady rounded-full border overflow-hidden flex flex-col items-center justify-center w-24 h-24"
                      style={{ ["--e" as any]: steady?.energy ?? 0.5 }}
                    >
                      <div className="font-semibold text-[13px] px-2 text-center leading-tight">{steady?.label ?? "—"}</div>
                      <div className="text-[10px] text-gray-600 mt-1">Estável</div>
                    </button>
                  </div>

                  {/* Gráfico 15 min com 3 linhas e labels na ponta */}
                  <TrendChart
                    now={new Date()}
                    hot={{ name: hot?.label ?? "Quente", points: hotSeries }}
                    cool={{ name: cool?.label ?? "Frio", points: coolSeries }}
                    steady={{ name: steady?.label ?? "Estável", points: steadySeries }}
                    height={140}
                  />

                  {/* Todas as bolhas menores */}
                  <div className="pt-1">
                    <div className="flex flex-wrap gap-3 justify-center">
                      {items.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelected(asDetail(b))}
                          className={[
                            "bubble rounded-full border overflow-hidden flex flex-col items-center justify-center",
                            b.state === "hot" && "bubble-hot",
                            b.state === "cool" && "bubble-cool",
                            b.state === "steady" && "bubble-steady",
                            sizeClasses("sm"),
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={{ ["--e" as any]: b.energy }}
                        >
                          <div className="text-[11px] font-medium px-2 text-center leading-tight">{b.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <TopicModal open={!!selected} topic={selected} onClose={() => setSelected(null)} />
    </>
  );
}
