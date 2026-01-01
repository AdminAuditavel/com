// src/app/components/BubbleBoard.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TopicModal, { type TopicDetail } from "@/app/components/TopicModal";

type Bubble = {
  id: string;
  label: string;
  state: "hot" | "steady" | "cool";
  size: "lg" | "md" | "sm";
};

type CategoryBlock = {
  title: string;
  items: Bubble[];
};

type Reaction = {
  id: string;
  kind: "in" | "out";
  // CSS vars
  x: string; // e.g. "35%"
  s: string; // e.g. "14px"
  dur: string; // e.g. "1200ms"
  dx: string; // e.g. "-40px"
  dy: string; // e.g. "30px"
  symbol: string; // e.g. "❤" or "●"
};

const INITIAL_DATA: CategoryBlock[] = [
  {
    title: "ESPORTES",
    items: [
      { id: "flamengo", label: "Flamengo", state: "hot", size: "lg" },
      { id: "palmeiras", label: "Palmeiras", state: "hot", size: "md" },
      { id: "corinthians", label: "Corinthians", state: "steady", size: "md" },
      { id: "selecao", label: "Seleção Brasileira", state: "steady", size: "sm" },
      { id: "ufc", label: "UFC", state: "steady", size: "sm" },
      { id: "mcgregor", label: "McGregor", state: "cool", size: "sm" },
      { id: "futebol-mundial", label: "Futebol Mundial", state: "hot", size: "md" },
    ],
  },
  {
    title: "POLÍTICA",
    items: [
      { id: "presidencia", label: "Presidência", state: "hot", size: "md" },
      { id: "congresso", label: "Congresso", state: "steady", size: "sm" },
      { id: "stf", label: "STF", state: "hot", size: "sm" },
      { id: "eleicoes-2026", label: "Eleições 2026", state: "steady", size: "sm" },
      { id: "gastos-publicos", label: "Gastos Públicos", state: "steady", size: "sm" },
    ],
  },
];

function stateLabel(s: Bubble["state"]) {
  if (s === "hot") return "Aquecendo";
  if (s === "cool") return "Esfriando";
  return "Estável";
}

function sizeClasses(size: Bubble["size"]) {
  if (size === "lg") return "w-36 h-36 text-base";
  if (size === "md") return "w-28 h-28 text-sm";
  return "w-22 h-22 text-xs";
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function BubbleItem({
  b,
  onSelect,
}: {
  b: Bubble;
  onSelect: (id: string) => void;
}) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const timersRef = useRef<number[]>([]);

  // limpa timeouts no unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    // Só anima em hot/cool
    if (b.state !== "hot" && b.state !== "cool") return;

    // taxa: hot mais frequente (entrando), cool um pouco menos (saindo)
    const intervalMs = b.state === "hot" ? 650 : 850;

    const iv = window.setInterval(() => {
      const id = crypto.randomUUID();

      if (b.state === "hot") {
        // “entrando”: vem de fora em direção ao centro
        const angle = rand(0, Math.PI * 2);
        const r = rand(34, 52); // distância inicial
        const dx = `${Math.round(Math.cos(angle) * r)}px`;
        const dy = `${Math.round(Math.sin(angle) * r)}px`;

        const reaction: Reaction = {
          id,
          kind: "in",
          x: `${Math.round(rand(35, 65))}%`, // não é usado no in (centrado), mas ok
          s: `${Math.round(rand(10, 14))}px`,
          dur: `${Math.round(rand(900, 1300))}ms`,
          dx,
          dy,
          symbol: "●",
        };

        setReactions((prev) => [...prev, reaction]);

        const to = window.setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== id));
        }, parseInt(reaction.dur, 10) + 80);
        timersRef.current.push(to);
      } else {
        // “saindo”: sobe e some (estilo reactions do YouTube)
        const reaction: Reaction = {
          id,
          kind: "out",
          x: `${Math.round(rand(18, 82))}%`,
          s: `${Math.round(rand(12, 18))}px`,
          dur: `${Math.round(rand(1000, 1700))}ms`,
          dx: "0px",
          dy: "0px",
          symbol: Math.random() < 0.55 ? "❤" : "●",
        };

        setReactions((prev) => [...prev, reaction]);

        const to = window.setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== id));
        }, parseInt(reaction.dur, 10) + 120);
        timersRef.current.push(to);
      }
    }, intervalMs);

    return () => window.clearInterval(iv);
  }, [b.state]);

  return (
    <button
      type="button"
      className={[
        "bubble rounded-full border",
        "flex flex-col items-center justify-center",
        "shadow-sm active:scale-[0.98] transition",
        "select-none",
        b.state === "hot" && "bubble-hot animate-pulseSoft",
        b.state === "steady" && "bubble-steady",
        b.state === "cool" && "bubble-cool",
        sizeClasses(b.size),
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${b.label} — ${stateLabel(b.state)}`}
      onClick={() => onSelect(b.id)}
    >
      {/* camada de reações (atrás do texto) */}
      <div className="reaction-layer" aria-hidden="true">
        {reactions.map((r) => (
          <span
            key={r.id}
            className={`reaction ${r.kind === "in" ? "reaction--in" : "reaction--out"}`}
            style={
              {
                ["--x" as any]: r.x,
                ["--s" as any]: r.s,
                ["--dur" as any]: r.dur,
                ["--dx" as any]: r.dx,
                ["--dy" as any]: r.dy,
              } as React.CSSProperties
            }
          >
            {r.symbol}
          </span>
        ))}
      </div>

      <span className="relative z-10 font-medium leading-tight text-center px-2">
        {b.label}
      </span>
      <span className="relative z-10 mt-1 text-[10px] text-gray-600">
        {stateLabel(b.state)}
      </span>
    </button>
  );
}

export default function BubbleBoard() {
  const [data, setData] = useState<CategoryBlock[]>(INITIAL_DATA);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isOpen = !!selectedId;

  const selected = useMemo<TopicDetail | null>(() => {
    if (!selectedId) return null;
    for (const cat of data) {
      const found = cat.items.find((b) => b.id === selectedId);
      if (found) return { id: found.id, label: found.label, state: found.state };
    }
    return null;
  }, [data, selectedId]);

  const allIds = useMemo(() => data.flatMap((c) => c.items.map((b) => b.id)), [data]);

  // Simulação do pulso (mantém o “vivo”)
  useEffect(() => {
    const t = window.setInterval(() => {
      const pick = allIds[Math.floor(Math.random() * allIds.length)];
      if (!pick) return;

      setData((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((b) => {
            if (b.id !== pick) return b;

            // ciclo: cool -> steady -> hot -> cool
            const nextState: Bubble["state"] =
              b.state === "cool" ? "steady" : b.state === "steady" ? "hot" : "cool";

            // ajuste leve no tamanho para dar sensação de pulso
            const nextSize: Bubble["size"] =
              nextState === "hot"
                ? b.size === "sm"
                  ? "md"
                  : "lg"
                : nextState === "cool"
                  ? b.size === "lg"
                    ? "md"
                    : "sm"
                  : b.size;

            return { ...b, state: nextState, size: nextSize };
          }),
        }))
      );
    }, 4500);

    return () => window.clearInterval(t);
  }, [allIds]);

  return (
    <>
      <section className="px-5 pb-10 space-y-10">
        {data.map((cat) => (
          <div key={cat.title}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold tracking-widest text-gray-500">
                {cat.title}
              </h2>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap gap-3">
                {cat.items.map((b) => (
                  <BubbleItem key={b.id} b={b} onSelect={(id) => setSelectedId(id)} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      <TopicModal open={isOpen} topic={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}
