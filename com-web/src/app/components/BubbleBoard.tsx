"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopicModal, { type TopicDetail } from "@/app/components/TopicModal";
import TrendChartsStack from "@/app/components/TrendChartsStack";
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

function asDetail(b: Bubble): TopicDetail {
  return { id: b.id, label: b.label, state: b.state };
}

function stateLabel(s: Bubble["state"]) {
  if (s === "hot") return "Aquecendo";
  if (s === "cool") return "Esfriando";
  return "Estável";
}

function makeSeries(mode: "up" | "down") {
  const pts: { t: number; v: number }[] = [];
  let v = mode === "up" ? 0.35 : 0.7;

  for (let i = 0; i <= 15; i++) {
    const drift = mode === "up" ? 0.018 : -0.018;
    v = clamp01(v + drift + (Math.random() * 0.06 - 0.03));
    pts.push({ t: i, v });
  }
  return pts;
}

function MessageIcon({ hot }: { hot?: boolean }) {
  // ícone simples de balão de fala
  return (
    <svg
      aria-hidden="true"
      className={hot ? "text-orange-600" : "text-slate-500"}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17v3l3-3h7a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4z" />
    </svg>
  );
}

type TopicCardProps = {
  bubble: Bubble & { category: string };
  onClick: () => void;
  size?: "lg" | "sm";
  emphasize?: "hot" | "cool" | "steady";
};

function TopicCard({ bubble, onClick, size = "sm", emphasize }: TopicCardProps) {
  const state = emphasize ?? bubble.state;
  const isHot = state === "hot";
  const isCool = state === "cool";

  const base =
    "flex flex-col justify-between rounded-2xl border shadow-sm transition hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400";
  const sizing = size === "lg" ? "w-28 h-28 p-3" : "w-24 h-24 p-2.5";
  const palette =
    state === "hot"
      ? "bg-orange-50 border-orange-200"
      : state === "cool"
      ? "bg-sky-50 border-sky-200"
      : "bg-white border-slate-200";

  return (
    <button type="button" onClick={onClick} className={`${base} ${sizing} ${palette}`}>
      <div className="flex items-center justify-between gap-1">
        <span
          className={[
            "rounded-full px-2 py-[3px] text-[10px] font-semibold tracking-wide",
            bubble.category === "ESPORTES" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700",
          ].join(" ")}
        >
          {bubble.category}
        </span>
        <MessageIcon hot={isHot} />
      </div>

      <div className="flex flex-col items-start gap-1">
        <span className="text-[12px] font-semibold leading-tight text-slate-900">{bubble.label}</span>
        <span
          className={[
            "text-[11px] font-medium",
            isHot ? "text-orange-700" : isCool ? "text-sky-700" : "text-slate-500",
          ].join(" ")}
        >
          {stateLabel(state)}
        </span>
      </div>
    </button>
  );
}

export default function BubbleBoard() {
  const [data, setData] = useState<CategoryBlock[]>(INITIAL_DATA);

  const [activeIndex, setActiveIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const goTo = useCallback((idx: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    el.scrollTo({ left: idx * w, behavior: "smooth" });
    setActiveIndex(idx);
  }, []);

  const onScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / w);
    setActiveIndex(idx);
  }, []);

  const [selected, setSelected] = useState<TopicDetail | null>(null);

  const hotRef = useRef<HTMLButtonElement | null>(null);
  const coolRef = useRef<HTMLButtonElement | null>(null);

  const activeCat = data[activeIndex];

  const CHANGE_MS = 10_000;
  const [pairTick, setPairTick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setPairTick((x) => x + 1), CHANGE_MS);
    return () => window.clearInterval(t);
  }, []);

  const [phase, setPhase] = useState(0);
  const cycleStartRef = useRef<number>(performance.now());

  useEffect(() => {
    cycleStartRef.current = performance.now();
    let raf = 0;

    const loop = () => {
      const now = performance.now();
      const p = Math.min(1, Math.max(0, (now - cycleStartRef.current) / CHANGE_MS));
      setPhase(p);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pairTick]);

  const { hotBubble, coolBubble } = useMemo(() => {
    const items = activeCat?.items ?? [];
    if (items.length < 2) return { hotBubble: items[0], coolBubble: items[1] };

    // mantém rotação, mas exibiremos ordenado abaixo
    return {
      hotBubble: items[pairTick % items.length],
      coolBubble: items[(pairTick + 1) % items.length],
    };
  }, [activeCat, pairTick]);

  useEffect(() => {
    if (!activeCat || !hotBubble || !coolBubble) return;

    const STEP_MS = 160;
    const t = window.setInterval(() => {
      setData((prev) =>
        prev.map((cat, idx) => {
          if (idx !== activeIndex) return cat;

          return {
            ...cat,
            items: cat.items.map((b) => {
              if (b.id === hotBubble.id) return { ...b, state: "hot", energy: clamp01(b.energy + 0.010), size: "md" };
              if (b.id === coolBubble.id) return { ...b, state: "cool", energy: clamp01(b.energy - 0.008), size: "sm" };

              const baseline = 0.5;
              return { ...b, state: "steady", energy: clamp01(b.energy + (baseline - b.energy) * 0.02) };
            }),
          };
        })
      );
    }, STEP_MS);

    return () => window.clearInterval(t);
  }, [activeIndex, activeCat, hotBubble?.id, coolBubble?.id]);

  // hot ganha glow, cool reduz glow — não usamos mais escala de bolha
  const hotGlow = 0.25 + 0.35 * phase; // para gradiente animado
  const coolGlow = 0.35 - 0.2 * phase;

  const hotSeries = useMemo(() => makeSeries("up"), [pairTick, activeIndex]);
  const coolSeries = useMemo(() => makeSeries("down"), [pairTick, activeIndex]);

  const getHotRect = useCallback(() => hotRef.current?.getBoundingClientRect() ?? null, []);
  const getCoolRect = useCallback(() => coolRef.current?.getBoundingClientRect() ?? null, []);

  // enriquece com categoria e ordena por energia para lista
  const itemsWithCategory = (cat: CategoryBlock | undefined) =>
    (cat?.items ?? []).map((b) => ({ ...b, category: cat?.title ?? "" }));

  const sortedItems = useMemo(() => {
    const items = itemsWithCategory(activeCat);
    return [...items].sort((a, b) => b.energy - a.energy);
  }, [activeCat]);

  return (
    <>
      <BubbleParticles
        active={!!hotBubble}
        mode="in"
        colorVar="var(--hot-br)"
        getSourceRect={getHotRect}
        intensity={14}
      />
      <BubbleParticles
        active={!!coolBubble}
        mode="out"
        colorVar="var(--cool-br)"
        getSourceRect={getCoolRect}
        intensity={12}
      />

      {/* Header/tabs em fundo claro */}
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.22em] text-slate-500">
                PULSO DO DEBATE
              </p>
              <p className="text-sm text-slate-600">O que está bombando agora</p>
            </div>
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
                      "px-3 py-2 rounded-full text-[11px] font-semibold tracking-widest transition border shadow-sm",
                      active
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200",
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
      </div>

      <div
        ref={viewportRef}
        onScroll={onScroll}
        className="w-full overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div className="flex w-full bg-slate-50">
          {data.map((cat) => {
            const items = itemsWithCategory(cat);
            const isActive = cat.title === activeCat?.title;

            const hot = isActive ? hotBubble : items[0];
            const cool = isActive ? coolBubble : items[1];

            return (
              <section
                key={cat.title}
                className="w-full flex-none snap-center px-5 pb-8"
                style={{ minHeight: "calc(100dvh - 72px)" }}
              >
                <div className="pt-6 flex flex-col gap-5">
                  <div className="flex justify-center gap-3">
                    <div
                      className="relative"
                      style={{
                        filter: `drop-shadow(0 10px 28px rgba(255,119,29,${hotGlow.toFixed(2)}))`,
                      }}
                    >
                      <div ref={isActive ? hotRef : undefined}>
                        {hot ? (
                          <TopicCard
                            bubble={{ ...(hot as Bubble), category: cat.title }}
                            onClick={() => setSelected(asDetail(hot as Bubble))}
                            size="lg"
                            emphasize="hot"
                          />
                        ) : null}
                      </div>
                    </div>

                    <div
                      className="relative"
                      style={{
                        filter: `drop-shadow(0 10px 24px rgba(56,189,248,${coolGlow.toFixed(2)}))`,
                      }}
                    >
                      <div ref={isActive ? coolRef : undefined}>
                        {cool ? (
                          <TopicCard
                            bubble={{ ...(cool as Bubble), category: cat.title }}
                            onClick={() => setSelected(asDetail(cool as Bubble))}
                            size="lg"
                            emphasize="cool"
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <TrendChartsStack
                    now={new Date()}
                    hot={{ name: hot?.label ?? "Quente", points: hotSeries }}
                    cool={{ name: cool?.label ?? "Frio", points: coolSeries }}
                  />

                  <div className="pt-2">
                    <div className="flex flex-wrap gap-3 justify-center">
                      {items
                        .sort((a, b) => b.energy - a.energy)
                        .map((b) => (
                          <TopicCard
                            key={b.id}
                            bubble={b}
                            onClick={() => setSelected(asDetail(b))}
                            size="sm"
                          />
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
