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

  // avança o par hot/cool a cada ciclo
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), CHANGE_MS);
    return () => window.clearInterval(t);
  }, []);

  // define 1 hot e 1 cool por categoria (os demais ficam steady)
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

  // aplica estados conforme hot/cool de cada categoria
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

  // blocos por estado: hot (todas as categorias), depois cool, depois steady
  const grouped = useMemo(() => {
    const hot: (Bubble & { category: string })[] = [];
    const cool: (Bubble & { category: string })[] = [];
    const steady: (Bubble & { category: string })[] = [];
    itemsWithCategory.forEach((b) => {
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
  }, [itemsWithCategory]);

  const renderCard = (b: Bubble & { category: string }) => {
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
            <div className="font-semibold text-slate-700">{(b.energy * 100).toFixed(0)} pts</div>
            <div>intensidade</div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <>
      <div className="w-full bg-slate-50 min-h-screen">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-10 pt-6">
          {grouped.hot.length > 0 && (
            <div className="space-y-3">
              {grouped.hot.map(renderCard)}
            </div>
          )}
          {grouped.cool.length > 0 && (
            <div className="space-y-3 pt-2">
              {grouped.cool.map(renderCard)}
            </div>
          )}
          {grouped.steady.length > 0 && (
            <div className="space-y-3 pt-2">
              {grouped.steady.map(renderCard)}
            </div>
          )}
        </div>
      </div>

      <TopicModal open={!!selected} topic={selected} onClose={() => setSelected(null)} />
    </>
  );
}
