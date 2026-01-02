"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import TopicModal, { type TopicDetail } from "@/app/components/TopicModal";

type Bubble = {
  id: string;
  label: string;
  state: "hot" | "steady" | "cool";
  size: "lg" | "md" | "sm";
  energy: number; // 0..1
  spark?: number; // trend % (-1..+1 aproximado)
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

function formatDeltaPct(v?: number) {
  const n = typeof v === "number" ? v : 0;
  const pct = Math.round(n * 100);
  if (pct > 0) return `+${pct}%`;
  return `${pct}%`;
}

function TrendPill({ state, spark }: { state: Bubble["state"]; spark?: number }) {
  const pct = formatDeltaPct(spark);
  const abs = Math.abs((spark ?? 0) * 100);

  // seta/símbolo simples e interpretável
  const icon = spark && spark > 0.5 ? "↑" : spark && spark < -0.5 ? "↓" : spark && spark > 0 ? "↗" : spark && spark < 0 ? "↘" : "→";

  // mensagem curta e sem “dashboard”
  const label =
    abs < 1 ? "quase estável" : spark && spark > 0 ? "subindo" : spark && spark < 0 ? "caindo" : "estável";

  const cls =
    state === "hot"
      ? "bg-orange-100 border-orange-200 text-orange-900"
      : state === "cool"
      ? "bg-sky-100 border-sky-200 text-sky-900"
      : "bg-slate-100 border-slate-200 text-slate-800";

  return (
    <div className={["inline-flex items-center gap-2 rounded-full border px-3 py-2", cls].join(" ")}>
      <span className="text-sm font-semibold leading-none">{icon}</span>
      <span className="text-sm font-semibold leading-none">{pct}</span>
      <span className="text-xs font-medium text-slate-700/80">últimos 15 min · {label}</span>
    </div>
  );
}

function HeatBar({ energy, state }: { energy: number; state: Bubble["state"] }) {
  const v = clamp01(energy);

  // cor “semáforo” leve baseada no estado, mas sem exagero
  const fill =
    state === "hot" ? "bg-orange-400" : state === "cool" ? "bg-sky-400" : "bg-slate-400";

  // posição do marcador (0..100%)
  const left = `${Math.round(v * 100)}%`;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
        <span>Baixo</span>
        <span>Médio</span>
        <span>Alto</span>
      </div>

      <div className="relative h-3 w-full rounded-full bg-slate-200 overflow-hidden">
        {/* preenchimento “grossão” */}
        <div className={["absolute left-0 top-0 h-full", fill].join(" ")} style={{ width: left, opacity: 0.65 }} />
        {/* marcador */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white border border-slate-300 shadow-sm"
          style={{ left, transform: "translate(-50%, -50%)" }}
        />
      </div>

      <div className="mt-2 text-xs text-slate-600">
        Nível de evidência:{" "}
        <span className="font-semibold text-slate-900">
          {v >= 0.72 ? "Alto" : v >= 0.45 ? "Médio" : "Baixo"}
        </span>
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

  // ordem estável por categoria (evita effect reiniciar a cada 160ms)
  const orderRef = useRef(
    INITIAL_DATA.map((cat) => ({
      title: cat.title,
      ids: cat.items.map((b) => b.id),
    }))
  );

  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), CHANGE_MS);
    return () => window.clearInterval(t);
  }, []);

  const hotCoolByCategory = useMemo(() => {
    return orderRef.current.map((c) => {
      const len = c.ids.length || 1;
      const hotIdx = tick % len;
      const coolIdx = (tick + 1) % len;
      return {
        title: c.title,
        hotId: c.ids[hotIdx],
        coolId: c.ids[coolIdx],
      };
    });
  }, [tick]);

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

  // ordem renderizada (hot -> cool -> steady)
  const renderOrderIds = useMemo(() => {
    const ids: string[] = [];
    grouped.hot.forEach((b) => ids.push(b.id));
    grouped.cool.forEach((b) => ids.push(b.id));
    grouped.steady.forEach((b) => ids.push(b.id));
    return ids;
  }, [grouped]);

  // card “featured”: primeiro visível no scroll (vai mudando conforme rola)
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardElsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveGraphId(renderOrderIds[0] ?? null);
  }, [renderOrderIds]);

  const computeActiveGraph = useCallback(() => {
    const sc = scrollRef.current;
    if (!sc) return;

    const top = sc.scrollTop;
    const threshold = 16;

    for (const id of renderOrderIds) {
      const el = cardElsRef.current[id];
      if (!el) continue;

      const y = el.offsetTop;
      if (y + el.offsetHeight >= top + threshold) {
        setActiveGraphId((prev) => (prev === id ? prev : id));
        return;
      }
    }
  }, [renderOrderIds]);

  const onScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      computeActiveGraph();
    });
  }, [computeActiveGraph]);

  useEffect(() => {
    computeActiveGraph();
  }, [computeActiveGraph]);

  const cardSizes = (featured: boolean, idxInGroup: number) => {
    if (featured) return "py-7 px-5";
    if (idxInGroup === 0) return "py-5 px-4";
    if (idxInGroup <= 2) return "py-4 px-4";
    return "py-3 px-3";
  };

  const renderCard = (b: Bubble & { category: string }, idx: number, group: "hot" | "cool" | "steady") => {
    const accent = stateAccent(b.state);
    const likedState = liked[b.id];
    const isFeatured = activeGraphId === b.id;

    return (
      <div
        key={`${group}-${b.id}`}
        ref={(el) => {
          cardElsRef.current[b.id] = el;
        }}
        className={[
          "w-full text-left rounded-2xl border shadow-sm",
          "flex flex-col gap-4",
          "hover:shadow-md active:translate-y-[1px]",
          "transition",
          accent.bg,
          accent.border,
          isFeatured ? "shadow-md ring-2 ring-orange-200" : "",
          cardSizes(isFeatured, idx),
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
              aria-label="Curtir"
            >
              ♥
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p
            className={[
              isFeatured
                ? "text-2xl md:text-3xl font-semibold text-slate-900 leading-tight"
                : "text-base font-semibold text-slate-900 leading-tight",
            ].join(" ")}
          >
            {b.label}
          </p>
          <p className={isFeatured ? "text-sm text-slate-600" : "text-sm text-slate-500"}>
            Toque para ver detalhes
          </p>
        </div>

        {/* SINAL DE LEITURA RÁPIDA (featured) */}
        {isFeatured && (
          <div className="w-full rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className="flex flex-col gap-3">
              <TrendPill state={b.state} spark={b.spark ?? (b.state === "cool" ? -0.06 : 0.06)} />
              <HeatBar energy={b.energy} state={b.state} />
            </div>
          </div>
        )}
      </div>
    );
  };

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
