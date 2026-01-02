"use client";

import { useEffect, useMemo, useState } from "react";
import TopicModal, { type TopicDetail } from "@/app/components/TopicModal";

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

function stateAccent(s: Bubble["state"]) {
  if (s === "hot") return { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" };
  if (s === "cool") return { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700" };
  return { bg: "bg-white", border: "border-slate-200", text: "text-slate-500" };
}

export default function BubbleBoard() {
  const [data, setData] = useState<CategoryBlock[]>(INITIAL_DATA);
  const [selected, setSelected] = useState<TopicDetail | null>(null);

  const CHANGE_MS = 10_000;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), CHANGE_MS);
    return () => window.clearInterval(t);
  }, []);

  // Simula aquecimento/esfriamento gradual
  useEffect(() => {
    const STEP_MS = 160;
    const t = window.setInterval(() => {
      setData((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((b, i) => {
            // alterna um "par" pseudo-aleatório com base no tick
            const hotIdx = (tick + i) % cat.items.length;
            const coolIdx = (tick + i + 1) % cat.items.length;
            if (cat.items[hotIdx]?.id === b.id) return { ...b, state: "hot", energy: clamp01(b.energy + 0.010) };
            if (cat.items[coolIdx]?.id === b.id) return { ...b, state: "cool", energy: clamp01(b.energy - 0.008) };
            const baseline = 0.5;
            return { ...b, state: "steady", energy: clamp01(b.energy + (baseline - b.energy) * 0.02) };
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

  const sortedItems = useMemo(() => {
    const priority = (s: Bubble["state"]) => (s === "hot" ? 0 : s === "cool" ? 1 : 2);
    return [...itemsWithCategory].sort((a, b) => {
      const pa = priority(a.state);
      const pb = priority(b.state);
      if (pa !== pb) return pa - pb;
      return b.energy - a.energy;
    });
  }, [itemsWithCategory]);

  return (
    <>
      <div className="w-full bg-slate-50 min-h-screen">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pb-10 pt-6">
          {sortedItems.map((b) => {
            const accent = stateAccent(b.state);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(asDetail(b))}
                className={[
                  "w-full text-left rounded-2xl border shadow-sm",
                  "flex flex-col gap-2 px-4 py-4",
                  "hover:shadow-md active:translate-y-[1px]",
                  "transition",
                  accent.bg,
                  accent.border,
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
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-base font-semibold text-slate-900 leading-tight">{b.label}</p>
                    <p className="mt-1 text-sm text-slate-500">Toque para ver por que está em alta</p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-500">
                    <div className="font-semibold text-slate-700">
                      {(b.energy * 100).toFixed(0)} pts
                    </div>
                    <div>intensidade</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <TopicModal open={!!selected} topic={selected} onClose={() => setSelected(null)} />
    </>
  );
}
