//src/app/components/BubbleBoard.tsx
"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import TopicModal, { type TopicDetail } from "@/app/components/TopicModal";

type Bubble = {
  id: string;
  label: string;
  state: "hot" | "steady" | "cool";
  size: "lg" | "md" | "sm";
  energy: number; // 0..1
  spark?: number; // trend % (aqui passará a ser recent_growth)
  evidence_score?: number; // <-- novo
};

type CategoryBlock = {
  title: string;
  items: Bubble[];
};

type BubbleBoardProps = {
  search?: string;
  /**
   * Offset do sticky featured para não ficar por baixo do header do Home.
   * Ajuste fino se precisar.
   */
  headerOffsetPx?: number;
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

function formatDeltaPct(v?: number) {
  const n = typeof v === "number" ? v : 0;
  const pct = Math.round(n * 100);
  if (pct > 0) return `+${pct}%`;
  return `${pct}%`;
}

function TrendInline({ spark, state }: { spark?: number; state: Bubble["state"] }) {
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

  const pillCls =
    state === "hot"
      ? "bg-orange-100/70 text-orange-800 border-orange-200/60"
      : state === "cool"
      ? "bg-sky-100/70 text-sky-800 border-sky-200/60"
      : "bg-slate-100/70 text-slate-700 border-slate-200/70";

  return (
    <div className="shrink-0 text-right">
      <div
        className={[
          "inline-flex items-center gap-1 rounded-full border px-2 py-1",
          "text-sm font-semibold",
          "backdrop-blur",
          pillCls,
        ].join(" ")}
      >
        <span className="leading-none">{icon}</span>
        <span className="leading-none">{pct}</span>
      </div>
      <div className="mt-1 text-[11px] text-slate-500">últimos 15 min</div>
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

/* ======================================================
   LÓGICA DE PRODUTO (MOTOR DE EVIDÊNCIA) — NOVO
   - recent_growth determinístico e suave por tópico
   - state derivado de growth (não aleatório por categoria)
   - energy com inércia
====================================================== */

function toStateFromGrowth(g: number, prev?: Bubble["state"]): Bubble["state"] {
  // thresholds de entrada (mais difíceis) e saída (mais fáceis)
  const HOT_IN = 0.12;
  const HOT_OUT = 0.06;

  const COOL_IN = -0.10;
  const COOL_OUT = -0.05;

  // mantém hot até cair abaixo do HOT_OUT
  if (prev === "hot") return g >= HOT_OUT ? "hot" : "steady";

  // mantém cool até subir acima do COOL_OUT
  if (prev === "cool") return g <= COOL_OUT ? "cool" : "steady";

  // entrada em hot/cool é mais exigente
  if (g >= HOT_IN) return "hot";
  if (g <= COOL_IN) return "cool";
  return "steady";
}

// crescimento recente (-0.22..+0.28) determinístico por tópico e tick
function simulateGrowthDet(topicId: string, tick: number) {
  const rand = makeSeededRand(hash32(topicId));

  const base = rand() * 0.20 - 0.10; // -0.10..+0.10
  const freq = 0.08 + rand() * 0.06; // 0.08..0.14
  const phase = rand() * Math.PI * 2;

  const wave = Math.sin(tick * freq + phase) * (0.06 + rand() * 0.05); // amplitude 0.06..0.11

  // choques raros e leves (picos de evidência)
  const shock = Math.sin(tick * 0.015 + phase * 0.7) > 0.92 ? 0.06 + rand() * 0.05 : 0;

  return Math.max(-0.22, Math.min(0.28, base + wave + shock));
}

function stepEnergy(prevEnergy: number, state: Bubble["state"]) {
  const baseline = 0.5;
  const e = clamp01(prevEnergy);

  if (state === "hot") return clamp01(e + 0.010 + (baseline - e) * 0.01);
  if (state === "cool") return clamp01(e - 0.010 + (baseline - e) * 0.01);

  return clamp01(e + (baseline - e) * 0.03);
}

function getEditorialBadge(b: Bubble) {
  const score = b.evidence_score ?? 0;

  if (b.state === "hot" && score >= 78) {
    return {
      text: "Em alta agora",
      cls: "bg-orange-500 text-white border-orange-500/40",
    };
  }

  if (b.state === "cool" && score <= 22) {
    return {
      text: "Perdendo fôlego",
      cls: "bg-sky-500 text-white border-sky-500/40",
    };
  }

  return null;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/**
 * evidence_score (0..100)
 * Intuição:
 * - growth (spark) pesa mais (produto = “agora”)
 * - energy pesa bastante (massa)
 * - bônus editorial para hot/cool (sem exagero)
 */
function computeEvidenceScore(energy: number, growth: number, state: Bubble["state"]) {
  const e = clamp(energy, 0, 1);
  const g = clamp(growth, -0.25, 0.25); // corta extremos para estabilidade

  // normaliza growth para 0..1 em torno de 0
  const g01 = (g + 0.25) / 0.5; // -0.25 -> 0 ; +0.25 -> 1

  // base: growth domina um pouco (A+C)
  let score = (g01 * 0.60 + e * 0.40) * 100;

  // toque editorial: hot ganha leve bônus; cool perde leve
  if (state === "hot") score += 6;
  if (state === "cool") score -= 4;

  return clamp(score, 0, 100);
}

function WaveBars({ id, state, energy }: { id: string; state: Bubble["state"]; energy: number }) {
  const v = clamp01(energy);

  const barCls = state === "hot" ? "bg-orange-400" : state === "cool" ? "bg-sky-400" : "bg-slate-400";
  const dur = state === "hot" ? 1400 : state === "cool" ? 1700 : 2200;
  const amp = state === "hot" ? 0.16 : state === "cool" ? 0.1 : 0.06;

  const baseLevel = 0.18 + v * 0.7;
  const COUNT = 26;

  const rand = makeSeededRand(hash32(id));

  const bars = Array.from({ length: COUNT }, (_, i) => {
    const t = COUNT <= 1 ? 0 : i / (COUNT - 1);

    const ramp =
      state === "hot"
        ? 0.3 + t * 0.9
        : state === "cool"
        ? 1.2 - t * 0.9
        : 0.78 + (rand() * 0.06 - 0.03);

    const jitter = rand() * 0.05 - 0.025;
    const h0 = Math.round(clamp01(baseLevel * ramp + jitter) * 100);

    const delay = Math.round(i * 22 * 10) / 10;
    const phase = (i % 2 === 0 ? 1 : -1) * (0.22 + rand() * 0.22);

    return { i, h0, delay, phase };
  });

  return (
    <div className="w-full h-full">
      <div
        className={[
          "relative w-full h-full rounded-3xl overflow-hidden",
          "border border-slate-200/60",
          "bg-white/70 backdrop-blur",
          "shadow-[0_8px_22px_rgba(15,23,42,0.06)]",
          "px-4 py-4",
        ].join(" ")}
      >
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

       <div className="relative z-10 flex items-center justify-start text-[11px] text-slate-600">
          <span>
            Evidência:{" "}
            <span className="font-semibold text-slate-900">
              {v >= 0.72 ? "Alta" : v >= 0.45 ? "Média" : "Baixa"}
            </span>
          </span>
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

export default function BubbleBoard({ search = "", headerOffsetPx = 148 }: BubbleBoardProps) {
  const [data, setData] = useState<CategoryBlock[]>(INITIAL_DATA);
  const [selected, setSelected] = useState<TopicDetail | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const CHANGE_MS = 10_000;
  const [tick, setTick] = useState(0);

  // mantém ordem estável; ainda útil para determinismo de tick
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

  /* ======================================================
     ATUALIZAÇÃO — AGORA POR MOTOR DE EVIDÊNCIA (NOVO)
     - spark = recent_growth
     - state = função do growth
     - energy = inércia por state
====================================================== */
  useEffect(() => {
    const STEP_MS = 160;

    const t = window.setInterval(() => {
      setData((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((b) => {
            const g = simulateGrowthDet(b.id, tick);
            const state = toStateFromGrowth(g, b.state);
            const nextEnergy = stepEnergy(b.energy, state);
            const score = computeEvidenceScore(nextEnergy, g, state);
            
            return {
              ...b,
              spark: g,
              state,
              energy: nextEnergy,
              evidence_score: score,
            };
          }),
        }))
      );
    }, STEP_MS);

    return () => window.clearInterval(t);
  }, [tick]);

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
    const byEvidenceDesc = (arr: typeof hot) =>
      arr.sort((a, b) => (b.evidence_score ?? 0) - (a.evidence_score ?? 0));
    
    return {
      hot: byEvidenceDesc(hot),
      cool: byEvidenceDesc(cool),
      steady: byEvidenceDesc(steady),
    };
  }, [filtered]);

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

  // ===== Sticky featured =====
  const [featuredId, setFeaturedId] = useState<string | null>(null);

  const stickyRef = useRef<HTMLDivElement | null>(null);
  const cardElsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setFeaturedId(flatList[0]?.id ?? null);
  }, [flatList]);

  const computeFeatured = useCallback(() => {
    if (!stickyRef.current) return;

    const stickyRect = stickyRef.current.getBoundingClientRect();
    const targetY = stickyRect.bottom + 2;

    let bestId: string | null = null;
    let bestDelta = Number.POSITIVE_INFINITY;

    for (const item of flatList) {
      const el = cardElsRef.current[item.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const delta = Math.abs(mid - targetY);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestId = item.id;
      }
    }

    if (!bestId && flatList.length > 0) bestId = flatList[flatList.length - 1].id;

    if (bestId) setFeaturedId((prev) => (prev === bestId ? prev : bestId));
  }, [flatList]);

  useEffect(() => {
    computeFeatured();
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        computeFeatured();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", computeFeatured);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", computeFeatured);
    };
  }, [computeFeatured]);

  const featured = featuredId ? byId.get(featuredId) ?? null : null;

  const openTopic = useCallback((b: Bubble & { category: string }) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setSelected(asDetail(b));
  }, []);

  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected]);

  const cardChrome = (b: Bubble) => {
    const borderTint =
      b.state === "hot"
        ? "border-orange-200/60"
        : b.state === "cool"
        ? "border-sky-200/60"
        : "border-slate-200/60";

    return [
      "w-full text-left rounded-3xl",
      "border",
      borderTint,
      "bg-white/80 backdrop-blur",
      "shadow-[0_10px_30px_rgba(15,23,42,0.06)]",
      "flex flex-col gap-4",
      "transition-transform transition-shadow duration-200",
      "hover:shadow-[0_14px_44px_rgba(15,23,42,0.10)]",
      "active:scale-[0.99]",
    ].join(" ");
  };

  const categoryPill = (category: string) =>
    [
      "rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide",
      "border border-slate-200/60 bg-white/60 backdrop-blur",
      category === "ESPORTES" ? "text-emerald-700" : "text-indigo-700",
    ].join(" ");

  const statePill = (state: Bubble["state"]) =>
    [
      "text-[12px] font-semibold px-2.5 py-1 rounded-full border backdrop-blur",
      state === "hot"
        ? "border-orange-200/60 bg-orange-100/60 text-orange-800"
        : state === "cool"
        ? "border-sky-200/60 bg-sky-100/60 text-sky-800"
        : "border-slate-200/70 bg-slate-100/60 text-slate-700",
    ].join(" ");

  const likeButtonCls = (likedState: boolean) =>
    [
      "inline-flex items-center justify-center",
      "w-9 h-9 rounded-full border",
      "text-[18px] leading-none",
      "transition-colors transition-transform duration-150",
      "active:scale-110",
      likedState
        ? "bg-rose-500 border-rose-500 text-white shadow-sm"
        : "bg-white/40 border-slate-200/80 text-slate-500 hover:border-slate-300 hover:text-slate-700",
    ].join(" ");

  const renderFeaturedCard = (b: Bubble & { category: string }) => {
    const likedState = liked[b.id];
    const badge = getEditorialBadge(b);
    
    return (
      <div className={[cardChrome(b), "p-6"].join(" ")} onClick={() => openTopic(b)}>
        <div className="flex items-center justify-between gap-2">
          <span className={categoryPill(b.category)}>{b.category}</span>
        
          <div className="flex items-center gap-2">
            {/* Badge editorial (hot / cool) */}
            {badge && (
              <span
                className={[
                  "inline-flex items-center rounded-full border px-2.5 py-1",
                  "text-[12px] font-semibold tracking-tight",
                  "shadow-sm",
                  badge.cls,
                ].join(" ")}
              >
                {badge.text}
              </span>
            )}
          
            {/* Pill técnico só quando NÃO há badge editorial (steady) */}
            {!badge && (
              <span className={statePill(b.state)}>
                {stateLabel(b.state)}
              </span>
            )}
          
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLiked((prev) => ({ ...prev, [b.id]: !prev[b.id] }));
              }}
              className={likeButtonCls(likedState)}
              aria-label={likedState ? "Descurtir" : "Curtir"}
            >
              {likedState ? "♥" : "♡"}
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[26px] md:text-[30px] font-semibold text-slate-900 leading-tight">{b.label}</p>
            <p className="text-[13px] text-slate-600">Toque para ver detalhes</p>
          </div>
          <TrendInline spark={b.spark ?? 0} state={b.state} />
        </div>

        <div className="w-full">
          <div className="h-28 md:h-32">
            <WaveBars id={b.id} state={b.state} energy={b.energy} />
          </div>
        </div>
      </div>
    );
  };

  const renderListCard = (b: Bubble & { category: string; group: string }) => {
    const likedState = liked[b.id];
    return (
      <div
        key={`${b.group}-${b.id}`}
        ref={(el) => {
          cardElsRef.current[b.id] = el;
        }}
        className={[cardChrome(b), "p-4"].join(" ")}
        onClick={() => openTopic(b)}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={categoryPill(b.category)}>{b.category}</span>

          <div className="flex items-center gap-2">
            {/* pill técnico só aparece se NÃO houver badge editorial */}
            {!badge && (
              <span className={statePill(b.state)}>
                {stateLabel(b.state)}
              </span>
            )}
          
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLiked((prev) => ({ ...prev, [b.id]: !prev[b.id] }));
              }}
              className={likeButtonCls(likedState)}
              aria-label={likedState ? "Descurtir" : "Curtir"}
            >
              {likedState ? "♥" : "♡"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[16px] font-semibold text-slate-900 leading-tight">{b.label}</p>
          <p className="text-[13px] text-slate-500">Toque para ver detalhes</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-4 pt-4">
        <div ref={stickyRef} className="sticky z-20" style={{ top: headerOffsetPx }}>
          {featured ? renderFeaturedCard(featured) : null}
        </div>

        <div className="flex flex-col gap-4 pb-24 pt-4">
          {flatList.map((b) => renderListCard(b))}
          <div style={{ height: 320 }} />
        </div>
      </div>

      {typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[1200] pointer-events-none">
            <div className="pointer-events-auto">
              <TopicModal open={!!selected} topic={selected} onClose={() => setSelected(null)} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
