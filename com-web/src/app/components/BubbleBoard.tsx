"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import TopicModal, { type TopicDetail } from "@/app/components/TopicModal";

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

// deterministic pseudo-random (para evitar mismatch de hidratação)
function hash32(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return h >>> 0;
}
function makeSeededRand(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// trend points determinísticos influenciados por "value" (spark)
function makeTrendPointsDet(id: string, mode: "up" | "down", value: number) {
  const rand = makeSeededRand(hash32(id + mode));
  const base = 0.42 + (rand() * 0.12 - 0.06); // ~0.36..0.54
  const totalDelta = clamp01(0.5 + value) - 0.5; // valor influencia inclinação
  const pts: { t: number; v: number }[] = [];
  let v = clamp01(base);
  [0, 5, 10, 15].forEach((t, idx, arr) => {
    if (idx > 0) {
      const step = totalDelta / (arr.length - 1);
      const jitter = rand() * 0.05 - 0.025;
      v = clamp01(v + step + jitter);
    }
    pts.push({ t, v });
  });
  return pts;
}

function formatTimeLabel(offsetMin: number) {
  const d = new Date(Date.now() - offsetMin * 60_000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Sparkline({ id, mode, value }: { id: string; mode: "up" | "down"; value: number }) {
  const pts = useMemo(() => makeTrendPointsDet(id, mode, value), [id, mode, value]);
  const path = useMemo(() => {
    const xs = [0, 33.3, 66.6, 100];
    const x = (_: number, i: number) => xs[i];
    const y = (v: number) => 8 + (1 - v) * 84; // padding 8 top/bottom
    return pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.t, i)},${y(p.v)}`)
      .join(" ");
  }, [pts]);

  const lastY = 8 + (1 - pts[pts.length - 1].v) * 84;
  const deltaPct = value ?? 0;
  const times = [15, 10, 5, 0].map((m) => formatTimeLabel(m));
  const gridLevels = [0, 0.25, 0.5, 1];

  return (
    <div className="w-full">
      <svg viewBox="0 0 120 110" className="h-28 w-full">
        {/* grid horizontal */}
        {gridLevels.map((lv) => {
          const yy = 8 + (1 - lv) * 84;
          return (
            <g key={lv}>
              <line
                x1={0}
                x2={100}
                y1={yy}
                y2={yy}
                stroke="#cbd5e1"
                strokeWidth="0.8"
                strokeDasharray="4 3"
              />
              <text
                x={104}
                y={yy + 3}
                className="text-[9px] fill-slate-500"
              >
                {Math.round(lv * 100)}%
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient id={`grad-${id}-${mode}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={mode === "up" ? "#fb923c" : "#38bdf8"} stopOpacity="0.7" />
            <stop offset="100%" stopColor={mode === "up" ? "#fdba74" : "#bae6fd"} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke={mode === "up" ? "#f97316" : "#0ea5e9"} strokeWidth={2.2} />
        <polyline points={`0,110 100,110 100,${lastY}`} fill={`url(#grad-${id}-${mode})`} opacity="0.18" />
        <circle r={3.6} fill={mode === "up" ? "#f97316" : "#0ea5e9"} cx="100" cy={lastY} />
        <text x="100" y={lastY - 5} textAnchor="end" className="text-[10px] fill-slate-700 font-semibold">
          {deltaPct > 0 ? `+${Math.round(deltaPct * 100)}%` : `${Math.round(deltaPct * 100)}%`}
        </text>
      </svg>
      <div className="flex justify-between text-[11px] text-slate-600 mt-1 px-1">
        {times.map((t) => (
          <span key={t}>{t}</span>
        ))}
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
    if (idx === 0) return "py-6 px-4 text-base"; // maior
    if (idx <= 2) return "py-4 px-4 text-sm";
    return "py-3 px-3 text-sm";
  };

  const renderCard = (b: Bubble & { category: string }, idx: number, group: "hot" | "cool" | "steady") => {
    const accent = stateAccent(b.state);
    const isMain = group === "hot" && idx === 0;
    const likedState = liked[b.id];

    return (
      <div
        key={`${group}-${b.id}`}
        className={[
          "w-full text-left rounded-2xl border shadow-sm",
          "flex flex-col gap-3",
          "hover:shadow-md active:translate-y-[1px]",
          "transition",
          accent.bg,
          accent.border,
          cardSizes(idx),
        ].join(" ")}
        onClick={() => setSelected(asDetail(b))}
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
            <p className={isMain ? "text-lg font-semibold text-slate-900 leading-tight" : "text-base font-semibold text-slate-900 leading-tight"}>
              {b.label}
            </p>
            <p className="mt-1 text-sm text-slate-500">Toque para ver detalhes</p>
          </div>
          <div className="shrink-0 text-right text-xs text-slate-500">
            <div className="font-semibold text-slate-700">{(b.energy * 100).toFixed(0)} pts</div>
            <div>intensidade</div>
          </div>
        </div>

        {isMain && (
          <div className="mt-1">
            <Sparkline
              id={b.id}
              mode={b.state === "cool" ? "down" : "up"}
              value={b.spark ?? (b.state === "cool" ? -0.15 : 0.2)}
            />
          </div>
        )}
      </div>
    );
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const onScroll = useCallback(() => {
    // reservado para sticky behaviors futuros
    scrollRef.current?.scrollTop;
  }, []);

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
          {grouped.hot.length > 0 && grouped.hot.map((b, idx) => renderCard(b, idx, "hot"))}
          {grouped.cool.length > 0 && grouped.cool.map((b, idx) => renderCard(b, idx, "cool"))}
          {grouped.steady.length > 0 && grouped.steady.map((b, idx) => renderCard(b, idx, "steady"))}
        </div>
      </div>

      <TopicModal open={!!selected} topic={selected} onClose={() => setSelected(null)} />
    </>
  );
}
