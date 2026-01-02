//src/app/components/BubbleBoard.tsx

"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import TopicModal, { type TopicDetail } from "@/app/components/TopicModal";

/* ======================================================
   TYPES
====================================================== */

type Bubble = {
  id: string;
  label: string;
  state: "hot" | "steady" | "cool";
  size: "lg" | "md" | "sm";
  energy: number;        // 0..1
  spark?: number;        // recent_growth (-1..+1)
};

type CategoryBlock = {
  title: string;
  items: Bubble[];
};

type BubbleBoardProps = {
  search?: string;
  headerOffsetPx?: number;
};

/* ======================================================
   INITIAL DATA (MOCK)
====================================================== */

const INITIAL_DATA: CategoryBlock[] = [
  {
    title: "ESPORTES",
    items: [
      { id: "flamengo", label: "Flamengo", state: "steady", size: "md", energy: 0.55 },
      { id: "palmeiras", label: "Palmeiras", state: "steady", size: "sm", energy: 0.48 },
      { id: "corinthians", label: "Corinthians", state: "steady", size: "sm", energy: 0.50 },
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
      { id: "congresso", label: "Congresso", state: "steady", size: "sm", energy: 0.50 },
      { id: "stf", label: "STF", state: "steady", size: "sm", energy: 0.48 },
      { id: "eleicoes-2026", label: "Eleições 2026", state: "steady", size: "sm", energy: 0.50 },
      { id: "gastos-publicos", label: "Gastos Públicos", state: "steady", size: "sm", energy: 0.42 },
    ],
  },
];

/* ======================================================
   UTILS
====================================================== */

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
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
  const pct = Math.round((v ?? 0) * 100);
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

/* ======================================================
   DETERMINISTIC RANDOM
====================================================== */

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
   PRODUCT LOGIC (EVIDENCE ENGINE)
====================================================== */

function toStateFromGrowth(g: number): Bubble["state"] {
  if (g >= 0.08) return "hot";
  if (g <= -0.06) return "cool";
  return "steady";
}

function simulateGrowthDet(topicId: string, tick: number) {
  const rand = makeSeededRand(hash32(topicId));

  const base = rand() * 0.20 - 0.10;
  const freq = 0.08 + rand() * 0.06;
  const phase = rand() * Math.PI * 2;

  const wave = Math.sin(tick * freq + phase) * (0.06 + rand() * 0.05);
  const shock =
    Math.sin(tick * 0.015 + phase * 0.7) > 0.92
      ? 0.06 + rand() * 0.05
      : 0;

  return clamp(base + wave + shock, -0.22, 0.28);
}

function stepEnergy(prev: number, state: Bubble["state"]) {
  const baseline = 0.5;
  if (state === "hot") return clamp(prev + 0.01, 0, 1);
  if (state === "cool") return clamp(prev - 0.01, 0, 1);
  return clamp(prev + (baseline - prev) * 0.03, 0, 1);
}

/* ======================================================
   COMPONENT
====================================================== */

export default function BubbleBoard({
  search = "",
  headerOffsetPx = 148,
}: BubbleBoardProps) {
  const [data, setData] = useState<CategoryBlock[]>(INITIAL_DATA);
  const [selected, setSelected] = useState<TopicDetail | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [tick, setTick] = useState(0);

  /* ---- clock ---- */
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 10_000);
    return () => window.clearInterval(t);
  }, []);

  /* ---- evidence update ---- */
  useEffect(() => {
    const STEP_MS = 160;

    const t = window.setInterval(() => {
      setData((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((b) => {
            const g = simulateGrowthDet(b.id, tick);
            const state = toStateFromGrowth(g);

            return {
              ...b,
              spark: g,
              state,
              energy: stepEnergy(b.energy, state),
            };
          }),
        }))
      );
    }, STEP_MS);

    return () => window.clearInterval(t);
  }, [tick]);

  /* ---- flatten ---- */
  const flatList = useMemo(
    () => data.flatMap((c) => c.items.map((b) => ({ ...b, category: c.title }))),
    [data]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flatList;
    return flatList.filter(
      (b) =>
        b.label.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
    );
  }, [flatList, search]);

  /* ---- featured by scroll ---- */
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const cardEls = useRef<Record<string, HTMLDivElement | null>>({});
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setFeaturedId(filtered[0]?.id ?? null);
  }, [filtered]);

  const computeFeatured = useCallback(() => {
    if (!stickyRef.current) return;

    const targetY = stickyRef.current.getBoundingClientRect().bottom + 2;

    let bestId: string | null = null;
    let bestDelta = Infinity;

    filtered.forEach((b) => {
      const el = cardEls.current[b.id];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      const d = Math.abs(mid - targetY);
      if (d < bestDelta) {
        bestDelta = d;
        bestId = b.id;
      }
    });

    if (bestId) setFeaturedId(bestId);
  }, [filtered]);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
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

  const featured = filtered.find((b) => b.id === featuredId) ?? null;

  /* ---- modal ---- */
  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected]);

  /* ======================================================
     RENDER (UI igual ao seu, resumido aqui)
     ⚠️ Você já tem os componentes visuais refinados
====================================================== */

  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-4 pt-4">
        <div ref={stickyRef} className="sticky z-20" style={{ top: headerOffsetPx }}>
          {featured && (
            <div onClick={() => setSelected(asDetail(featured))}>
              {/* SEU CARD FEATURED ATUAL AQUI */}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 pb-24 pt-4">
          {filtered.map((b) => (
            <div
              key={b.id}
              ref={(el) => (cardEls.current[b.id] = el)}
              onClick={() => setSelected(asDetail(b))}
            >
              {/* SEU CARD LISTA ATUAL AQUI */}
            </div>
          ))}
        </div>
      </div>

      {typeof window !== "undefined" &&
        createPortal(
          <TopicModal
            open={!!selected}
            topic={selected}
            onClose={() => setSelected(null)}
          />,
          document.body
        )}
    </>
  );
}
