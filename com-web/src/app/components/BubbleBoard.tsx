"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopicModal, { type TopicDetail } from "@/app/components/TopicModal";
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

function MessageSquareIcon({ hot }: { hot?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={hot ? "text-orange-600" : "text-slate-500"}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
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

  const sizing = size === "lg" ? "w-28 h-28 p-3" : "w-24 h-24 p-2.5";
  const fillColor =
    state === "hot"
      ? "rgb(255 237 213)" // orange-50
      : state === "cool"
      ? "rgb(224 242 254)" // sky-50
      : "white";
  const strokeColor =
    state === "hot"
      ? "rgb(254 215 170)" // orange-200
      : state === "cool"
      ? "rgb(186 230 253)" // sky-200
      : "rgb(226 232 240)"; // slate-200

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative overflow-hidden",
        "flex flex-col justify-between",
        "transition hover:-translate-y-[1px] hover:shadow-md active:translate-y-0",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400",
        sizing,
      ].join(" ")}
      style={{
        filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.06))",
      }}
    >
      {/* fundo em formato message-square via SVG que você mandou */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 24 24"
        preserveAspectRatio="none"
      >
        <path
          d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={1.4}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="relative z-10 flex items-center justify-between gap-1">
        <span
          className={[
            "rounded-full px-2 py-[3px] text-[10px] font-semibold tracking-wide",
            bubble.category === "ESPORTES" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700",
          ].join(" ")}
        >
          {bubble.category}
        </span>
        <MessageSquareIcon hot={isHot} />
      </div>

      <div className="relative z-10 flex flex-col items-start gap-1">
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
  const [selected, setSelected] = useState<TopicDetail | null>(null);

  const hotRef = useRef<HTMLDivElement | null>(null);
  const coolRef = useRef<HTMLDivElement | null>(null);

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

  const itemsWithCategory = useMemo(
    () => data.flatMap((cat) => cat.items.map((b) => ({ ...b, category: cat.title }))),
    [data]
  );

  const { hotBubble, coolBubble } = useMemo(() => {
    const items = itemsWithCategory;
    if (items.length < 2) return { hotBubble: items[0], coolBubble: items[1] };
    return {
      hotBubble: items[pairTick % items.length],
      coolBubble: items[(pairTick + 1) % items.length],
    };
  }, [itemsWithCategory, pairTick]);

  useEffect(() => {
    if (!hotBubble || !coolBubble) return;
    const STEP_MS = 160;
    const t = window.setInterval(() => {
      setData((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((b) => {
            if (b.id === hotBubble.id) return { ...b, state: "hot", energy: clamp01(b.energy + 0.010), size: "md" };
            if (b.id === coolBubble.id) return { ...b, state: "cool", energy: clamp01(b.energy - 0.008), size: "sm" };
            const baseline = 0.5;
            return { ...b, state: "steady", energy: clamp01(b.energy + (baseline - b.energy) * 0.02) };
          }),
        }))
      );
    }, STEP_MS);
    return () => window.clearInterval(t);
  }, [hotBubble?.id, coolBubble?.id]);

  const hotGlow = 0.25 + 0.35 * phase;
  const coolGlow = 0.35 - 0.2 * phase;

  const sortedItems = useMemo(() => {
    return [...itemsWithCategory].sort((a, b) => b.energy - a.energy);
  }, [itemsWithCategory]);

  const getHotRect = useCallback(() => hotRef.current?.getBoundingClientRect() ?? null, []);
  const getCoolRect = useCallback(() => coolRef.current?.getBoundingClientRect() ?? null, []);

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

      <div className="w-full bg-slate-50 min-h-screen">
        <div className="px-5 pb-10 pt-6 flex flex-col gap-5">
          <div className="flex justify-center gap-3">
            <div
              className="relative"
              style={{
                filter: `drop-shadow(0 10px 28px rgba(255,119,29,${hotGlow.toFixed(2)}))`,
              }}
            >
              <div ref={hotRef}>
                {hotBubble ? (
                  <TopicCard
                    bubble={hotBubble as Bubble & { category: string }}
                    onClick={() => setSelected(asDetail(hotBubble as Bubble))}
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
              <div ref={coolRef}>
                {coolBubble ? (
                  <TopicCard
                    bubble={coolBubble as Bubble & { category: string }}
                    onClick={() => setSelected(asDetail(coolBubble as Bubble))}
                    size="lg"
                    emphasize="cool"
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex flex-wrap gap-3 justify-center">
              {sortedItems.map((b) => (
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
      </div>

      <TopicModal open={!!selected} topic={selected} onClose={() => setSelected(null)} />
    </>
  );
}
