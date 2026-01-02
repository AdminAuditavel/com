"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
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
  if (s === "hot") return { bg: "bg-orange-50", border: "border-orange-200", ring: "ring-orange-200" };
  if (s === "cool") return { bg: "bg-sky-50", border: "border-sky-200", ring: "ring-sky-200" };
  return { bg: "bg-white", border: "border-slate-200", ring: "ring-slate-200" };
}

function formatDeltaPct(v?: number) {
  const n = typeof v === "number" ? v : 0;
  const pct = Math.round(n * 100);
  if (pct > 0) return `+${pct}%`;
  return `${pct}%`;
}

function TrendInline({ spark }: { spark?: number }) {
  const pct = formatDeltaPct(spark);
  const icon =
    spark && spark > 0.5
      ? "↑"
      : spark && spark < -0.5
      ? "↓"
      : spark && spark > 0
      ? "↗"
      : spark && spark < 0
      ? "↘"
      : "→";

  return (
    <div className="shrink-0 text-right leading-tight">
      <div className="text-sm font-semibold text-slate-900">
        <span className="mr-1">{icon}</span>
        {pct}
      </div>
      <div className="text-[11px] text-slate-500">últimos 15 min</div>
    </div>
  );
}

// deterministic pseudo-random
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

function WaveBars({ id, state, energy }: { id: string; state: Bubble["state"]; energy: number }) {
  const v = clamp01(energy);

  const barCls = state === "hot" ? "bg-orange-400" : state === "cool" ? "bg-sky-400" : "bg-slate-400";
  const dur = state === "hot" ? 1400 : state === "cool" ? 1700 : 2200;
  const amp = state === "hot" ? 0.16 : state === "cool" ? 0.10 : 0.06;

  const baseLevel = 0.18 + v * 0.70;
  const COUNT = 26;

  const rand = makeSeededRand(hash32(id));

  const bars = Array.from({ length: COUNT }, (_, i) => {
    const t = COUNT <= 1 ? 0 : i / (COUNT - 1);

    const ramp =
      state === "hot"
        ? 0.30 + t * 0.90
        : state === "cool"
        ? 1.20 - t * 0.90
        : 0.78 + (rand() * 0.06 - 0.03);

    const jitter = rand() * 0.05 - 0.025;
    const h0 = Math.round(clamp01(baseLevel * ramp + jitter) * 100);

    const delay = Math.round(i * 22 * 10) / 10;
    const phase = (i % 2 === 0 ? 1 : -1) * (0.22 + rand() * 0.22);

    return { i, h0, delay, phase };
  });

  return (
    <div className="w-full h-full">
      <div className="relative w-full h-full rounded-2xl border border-slate-200 bg-white/70 overflow-hidden px-4 py-4">
        <div className="absolute inset-0 px-4 py-4 flex items-end gap-[6px]">
          {bars.map((b) => (
            <div
              key={b.i}
              className={["flex-1 rounded-full opacity-90", barCls, "wavebar"].join(" ")}
              style={
                {
                  height: `${b.h0}%`,
                  animationDuration: `${dur}ms`,
                  animationDelay: `${b.delay}ms`,
                  ["--amp" as any]: amp,
                  ["--phase" as any]: b.phase,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-600">
          <span>
            Evidência:{" "}
            <span className="font-semibold text-slate-900">{v >= 0.72 ? "Alta" : v >= 0.45 ? "Média" : "Baixa"}</span>
          </span>
          <span className="text-slate-500">{state === "hot" ? "ganhando força" : state === "cool" ? "perdendo força" : "estável"}</span>
        </div>
      </div>

      <style jsx>{`
        .wavebar {
          transform-origin: bottom;
          animation-name: breathPulse;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes breathPulse {
          0% {
            transform: scaleY(calc(1 - var(--amp) * 0.55));
            opacity: 0.82;
          }
          50% {
            transform: scaleY(calc(1 + var(--amp) * (0.9 + var(--phase) * 0.2)));
            opacity: 0.96;
          }
          100% {
            transform: scaleY(calc(1 - var(--amp) * 0.45));
            opacity: 0.84;
          }
        }
      `}</style>
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

  // ordem estável por categoria (evita reiniciar STEP)
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
      return { title: c.title, hotId: c.ids[hotIdx], coolId: c.ids[coolIdx] };
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
    return { hot: byEnergyDesc(hot), cool: byEnergyDesc(cool), steady: byEnergyDesc(steady) };
  }, [filtered]);

  // lista “flat” renderizada
  const flatList = useMemo(() => {
    const out: (Bubble & { category: string; group: "hot" | "cool" | "steady" })[] = [];
    grouped.hot.forEach((b) => out.push({ ...b, group: "hot" }));
    grouped.cool.forEach((b) => out.push({ ...b, group: "cool" }));
    grouped.steady.forEach((b) => out.push({ ...b, group: "steady" }));
    return out;
  }, [grouped]);

  const byId = useMemo(() => {
    const m = new Map<string, Bubble & { category: string; group: "hot" | "cool" | "steady" }>();
    flatList.forEach((b) => m.set(b.id, b));
    return m;
  }, [flatList]);

  // ===== Sticky featured (scroll da JANELA, sem overflow interno) =====
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const cardElsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const rafRef = useRef<number | null>(null);

  const [stickyH, setStickyH] = useState<number>(280);

  useEffect(() => {
    setFeaturedId(flatList[0]?.id ?? null);
  }, [flatList]);

  useEffect(() => {
    if (!stickyRef.current) return;

    const el = stickyRef.current;
    const ro = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setStickyH(h);
    });
    ro.observe(el);

    const h0 = el.getBoundingClientRect().height;
    if (h0 > 0) setStickyH(h0);

    return () => ro.disconnect();
  }, []);

  const computeFeatured = useCallback(() => {
    if (flatList.length === 0) return;

    const stickyTop = 78; // top do sticky (mesmo valor do className top-[78px])
    const targetY = stickyTop + stickyH + 12; // linha logo abaixo do sticky, em coordenadas do viewport
    const TOL = 10;

    let bestId: string | null = null;
    let bestDelta = Number.POSITIVE_INFINITY;

    // escolhe o primeiro card cujo topo está mais próximo da linha target (logo abaixo do sticky)
    for (const item of flatList) {
      const el = cardElsRef.current[item.id];
      if (!el) continue;

      const r = el.getBoundingClientRect();
      const delta = r.top - targetY;

      if (delta >= -TOL && delta < bestDelta) {
        bestDelta = delta;
        bestId = item.id;
      }
    }

    // se nenhum atende (fim da página), força o último
    if (!bestId) bestId = flatList[flatList.length - 1].id;

    setFeaturedId((prev) => (prev === bestId ? prev : bestId));
  }, [flatList, stickyH]);

  const onWindowScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      computeFeatured();
    });
  }, [computeFeatured]);

  useEffect(() => {
    computeFeatured();
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    window.addEventListener("resize", computeFeatured);
    return () => {
      window.removeEventListener("scroll", onWindowScroll);
      window.removeEventListener("resize", computeFeatured);
    };
  }, [computeFeatured, onWindowScroll]);

  const featured = featuredId ? byId.get(featuredId) ?? null : null;

  // ===== UI =====
  const renderFeaturedCard = (b: Bubble & { category: string }) => {
    const likedState = liked[b.id];
    const accent = stateAccent(b.state);

    return (
      <div
        className={[
          "w-full text-left rounded-2xl border shadow-sm",
          "flex flex-col gap-4",
          "py-7 px-5",
          "shadow-md ring-2",
          accent.bg,
          accent.border,
          accent.ring, // <- ring agora muda conforme status
          "transition",
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

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-2xl md:text-3xl font-semibold text-slate-900 leading-tight">{b.label}</p>
            <p className="text-sm text-slate-600">Toque para ver detalhes</p>
          </div>

          <TrendInline spark={b.spark ?? (b.state === "cool" ? -0.06 : 0.06)} />
        </div>

        <div className="w-full">
          <div className="h-28 md:h-32">
            <WaveBars id={b.id} state={b.state} energy={b.energy} />
          </div>
        </div>
      </div>
    );
  };

  const renderListCard = (b: Bubble & { category: string; group: string }, idx: number) => {
    const likedState = liked[b.id];
    const accent = stateAccent(b.state);

    return (
      <div
        key={`${b.group}-${b.id}`}
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
          idx === 0 ? "py-5 px-4" : "py-3 px-3",
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
          <p className="text-base font-semibold text-slate-900 leading-tight">{b.label}</p>
          <p className="text-sm text-slate-500">Toque para ver detalhes</p>
        </div>
      </div>
    );
  };

  // Spacer: empurra a lista para baixo do sticky featured (dinâmico e correto)
  const spacerH = Math.max(200, stickyH + 16);

  // Modal via Portal: garante overlay no topo, independente do layout/scroll
  const modalNode =
    typeof document !== "undefined"
      ? ReactDOM.createPortal(
          <TopicModal open={!!selected} topic={selected} onClose={() => setSelected(null)} />,
          document.body
        )
      : null;

  return (
    <>
      <div className="w-full bg-slate-50 min-h-screen">
        {/* Search sticky */}
        <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur px-4 pt-4 pb-2 border-b border-slate-200">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tema ou categoria..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-12">
          {/* Featured sticky (card principal fixo) */}
          <div ref={stickyRef} className="sticky top-[78px] z-20">
            {featured ? renderFeaturedCard(featured) : null}
          </div>

          {/* Spacer para a lista não ficar por baixo do featured */}
          <div style={{ height: spacerH }} />

          {/* Lista (sem scroll interno; scroll é da página) */}
          <div className="flex flex-col gap-4">
            {flatList.map((b, idx) => renderListCard(b, idx))}
          </div>
        </div>
      </div>

      {modalNode}
    </>
  );
}
