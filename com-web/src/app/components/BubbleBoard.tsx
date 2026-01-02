"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import TopicModal, { type TopicDetail } from "@/app/components/TopicModal";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

type Bubble = {
  id: string;
  label: string;
  state: "hot" | "steady" | "cool";
  size: "lg" | "md" | "sm";
  energy: number; // 0..1
  spark?: number; // trend %
};

type CategoryBlock = {
  title: string;
  items: Bubble[];
};

const INITIAL_DATA: CategoryBlock[] = [
  {
    title: "ESPORTES",
    items: [
      { id: "flamengo", label: "Flamengo", state: "steady", size: "md", energy: 0.55, spark: 0.12 },
      { id: "palmeiras", label: "Palmeiras", state: "steady", size: "sm", energy: 0.48, spark: -0.08 },
      { id: "corinthians", label: "Corinthians", state: "steady", size: "sm", energy: 0.5, spark: 0.05 },
      { id: "selecao", label: "Seleção Brasileira", state: "steady", size: "sm", energy: 0.45, spark: 0.18 },
      { id: "ufc", label: "UFC", state: "steady", size: "sm", energy: 0.44, spark: -0.04 },
      { id: "mcgregor", label: "McGregor", state: "steady", size: "sm", energy: 0.35, spark: 0.22 },
      { id: "futebol-mundial", label: "Futebol Mundial", state: "steady", size: "sm", energy: 0.52, spark: 0.11 },
    ],
  },
  {
    title: "POLÍTICA",
    items: [
      { id: "presidencia", label: "Presidência", state: "steady", size: "md", energy: 0.56, spark: 0.14 },
      { id: "congresso", label: "Congresso", state: "steady", size: "sm", energy: 0.5, spark: -0.06 },
      { id: "stf", label: "STF", state: "steady", size: "sm", energy: 0.48, spark: 0.03 },
      { id: "eleicoes-2026", label: "Eleições 2026", state: "steady", size: "sm", energy: 0.5, spark: 0.19 },
      { id: "gastos-publicos", label: "Gastos Públicos", state: "steady", size: "sm", energy: 0.42, spark: -0.09 },
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

function stateAccent(s: Bubble["state"]) {
  if (s === "hot") return { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" };
  if (s === "cool") return { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700" };
  return { bg: "bg-white", border: "border-slate-200", text: "text-slate-500" };
}

function makeTrendPoints(mode: "up" | "down") {
  // 4 pontos (15,10,5,0 min atrás)
  const base = mode === "up" ? 0.4 : 0.7;
  const drift = mode === "up" ? 0.05 : -0.05;
  const arr = [];
  let v = base;
  for (let i = 3; i >= 0; i--) {
    v = clamp01(v + drift + (Math.random() * 0.08 - 0.04));
    arr.push({ t: i * 5, v });
  }
  return arr.sort((a, b) => a.t - b.t);
}

function Sparkline({ mode, value }: { mode: "up" | "down"; value: number }) {
  const pts = useMemo(() => makeTrendPoints(mode), [mode]);
  const path = useMemo(() => {
    const maxT = 15;
    const maxV = 1;
    const x = (t: number) => (t / maxT) * 100;
    const y = (v: number) => 100 - v * 90;
    return pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.t)},${y(p.v)}`)
      .join(" ");
  }, [pts]);

  return (
    <div className="w-full">
      <svg viewBox="0 0 100 100" className="h-20 w-full">
        <defs>
          <linearGradient id={`grad-${mode}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={mode === "up" ? "#fb923c" : "#38bdf8"} stopOpacity="0.7" />
            <stop offset="100%" stopColor={mode === "up" ? "#fdba74" : "#bae6fd"} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke={mode === "up" ? "#f97316" : "#0ea5e9"} strokeWidth={2.4} />
        <circle
          r={3.6}
          fill={mode === "up" ? "#f97316" : "#0ea5e9"}
          cx="100"
          cy={100 - pts[pts.length - 1].v * 90}
        />
        <text
          x="100"
          y={100 - pts[pts.length - 1].v * 90 - 4}
          textAnchor="end"
          className="text-[9px] fill-slate-700"
        >
          {value > 0 ? `+${Math.round(value * 100)}%` : `${Math.round(value * 100)}%`}
        </text>
        <polyline
          points={`0,100 100,100 100,${100 - pts[pts.length - 1].v * 90}`}
          fill={`url(#grad-${mode})`}
          opacity="0.18"
        />
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>−15 min</span>
        <span>−10</span>
        <span>−5</span>
        <span>agora</span>
      </div>
    </div>
  );
}

export default function BubbleBoard() {
  const [data, setData] = useState<CategoryBlock[]>(INITIAL_DATA);
  const [selected, setSelected] = useState<TopicDetail | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const CHANGE_MS = 10_000;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), CHANGE_MS);
    return () => window.clearInterval(t);
  }, []);

  const hotCoolByCategory = useMemo(() => {
    return data.map((cat) => {
      const len = cat.items.length || 1;
      const hotIdx = tick % len;
      const coolIdx = (tick + 1) % len;
      return {
        title: cat.title,
        hotId: cat.items[hotIdx]?.id,
        coolId: cat.items[coolIdx]?.id,
      };
    });
  }, [data, tick]);

  useEffect(() => {
    const hotIds = new Set<string>();
    const coolIds = new Set<string>();
    hotCoolByCategory.forEach((c) => {
      if (c.hotId) hotIds.add(c.hotId);
      if (c.coolId) coolIds.add(c.coolId);
    });

    const STEP_MS = 160;
    const t = window.setInterval(() => {
      setData((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((b) => {
            if (hotIds.has(b.id)) return { ...b, state: "hot", energy: clamp01(b.energy + 0.010) };
            if (coolIds.has(b.id)) return { ...b, state: "cool", energy: clamp01(b.energy - 0.008) };
            const baseline = 0.5;
            return { ...b, state: "steady", energy: clamp01(b.energy + (baseline - b.energy) * 0.02) };
          }),
        }))
      );
    }, STEP_MS);

    return () => window.clearInterval(t);
  }, [hotCoolByCategory]);

  const itemsWithCategory = useMemo(
    () => data.flatMap((cat) => cat.items.map((b) => ({ ...b, category: cat.title }))),
    [data]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return itemsWithCategory;
    return itemsWithCategory.filter(
      (b) => b.label.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)
    );
  }, [itemsWithCategory, search]);

  const grouped = useMemo(() => {
    const hot: (Bubble & { category: string })[] = [];
    const cool: (Bubble & { category: string })[] = [];
    const steady: (Bubble & { category: string })[] = [];
    filtered.forEach((b) => {
      if (b.state === "hot") hot.push(b);
      else if (b.state === "cool") cool.push(b);
      else steady.push(b);
    });
    const byEnergyDesc = (arr: typeof hot) => arr.sort((a, b) => b.energy - a.energy);
    return {
      hot: byEnergyDesc(hot),
      cool: byEnergyDesc(cool),
      steady: byEnergyDesc(steady),
    };
  }, [filtered]);

  const cardSizes = (idx: number) => {
    if (idx === 0) return "py-5 px-4 text-base"; // maior
    if (idx <= 2) return "py-4 px-4 text-sm"; // médio
    return "py-3 px-3 text-sm"; // menor
  };

  const renderCard = (b: Bubble & { category: string }, idx: number, group: "hot" | "cool" | "steady") => {
    const accent = stateAccent(b.state);
    const isMain = group === "hot" && idx === 0;
    const likedState = liked[b.id];

    return (
      <motion.button
        layout
        key={`${group}-${b.id}`}
        type="button"
        onClick={() => setSelected(asDetail(b))}
        className={[
          "w-full text-left rounded-2xl border shadow-sm",
          "flex flex-col gap-3",
          "hover:shadow-md active:translate-y-[1px]",
          "transition",
          accent.bg,
          accent.border,
          cardSizes(idx),
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={[
              "rounded-full px-3 py-[5px] text-[11px] font-semibold tracking-wide",
              b.category === "ESPORTES" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700",
            ].join(" ")}
          >
            {b.category}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={[
                "text-[12px] font-semibold px-2 py-1 rounded-full border",
                b.state === "hot"
                  ? "border-orange-200 bg-orange-100 text-orange-800"
                  : b.state === "cool"
                  ? "border-sky-200 bg-sky-100 text-sky-800"
                  : "border-slate-200 bg-slate-100 text-slate-700",
              ].join(" ")}
            >
              {stateLabel(b.state)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLiked((prev) => ({ ...prev, [b.id]: !prev[b.id] }));
              }}
              className={[
                "rounded-full border px-2 py-1 text-[12px] font-semibold",
                likedState ? "bg-rose-500 border-rose-500 text-white" : "bg-white border-slate-200 text-slate-600",
              ].join(" ")}
            >
              ♥
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-base font-semibold text-slate-900 leading-tight">{b.label}</p>
            <p className="mt-1 text-sm text-slate-500">Toque para ver detalhes</p>
          </div>
          <div className="shrink-0 text-right text-xs text-slate-500">
            <div className="font-semibold text-slate-700">{(b.energy * 100).toFixed(0)} pts</div>
            <div>intensidade</div>
          </div>
        </div>

        {isMain && (
          <div className="mt-1">
            <Sparkline mode={b.state === "cool" ? "down" : "up"} value={b.spark ?? (b.state === "cool" ? -0.15 : 0.2)} />
          </div>
        )}
      </motion.button>
    );
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 60], [1, 0.92]);

  const onScroll = useCallback(() => {
    if (!scrollRef.current) return;
    y.set(scrollRef.current.scrollTop);
  }, [y]);

  return (
    <>
      <div className="w-full bg-slate-50 min-h-screen">
        <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur px-4 pt-4 pb-2 border-b border-slate-200">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tema ou categoria..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-12 pt-4 overflow-y-auto"
          style={{ minHeight: "calc(100vh - 80px)" }}
        >
          <AnimatePresence initial={false}>
            {grouped.hot.map((b, idx) => (
              <motion.div key={`hot-${b.id}`} layout style={{ opacity }}>
                {renderCard(b, idx, "hot")}
              </motion.div>
            ))}
            {grouped.cool.map((b, idx) => (
              <motion.div key={`cool-${b.id}`} layout style={{ opacity }}>
                {renderCard(b, idx, "cool")}
              </motion.div>
            ))}
            {grouped.steady.map((b, idx) => (
              <motion.div key={`steady-${b.id}`} layout style={{ opacity }}>
                {renderCard(b, idx, "steady")}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <TopicModal open={!!selected} topic={selected} onClose={() => setSelected(null)} />
    </>
  );
}
