"use client";

import { useState } from "react";
import BubbleBoard from "@/app/components/BubbleBoard";

export default function Home() {
  const [search, setSearch] = useState("");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="mx-auto w-full max-w-3xl px-4 pt-5 pb-4">
          {/* Título maior */}
          <h1
            className="text-center text-[22px] md:text-[26px] font-semibold tracking-tight"
            style={{ color: "#1c8080" }}
          >
            O que está explodindo agora
          </h1>

          {/* Subtítulo com tom laranja (sutil) */}
          <p className="text-center text-[13px] md:text-[14px] text-orange-700/80 mt-2">
            Atualizado continuamente
          </p>

          {/* Busca com detalhes em laranja */}
          <div className="mt-4 relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-orange-600/70">
              ⌕
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tema ou categoria..."
              className={[
                "w-full h-12 rounded-2xl",
                "border border-orange-200/70 bg-white/75",
                "pl-9 pr-4 text-[15px]",
                "shadow-sm",
                "focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300",
              ].join(" ")}
            />
          </div>
        </div>
      </header>

      {/* Ajuste do offset por conta do header mais alto */}
      <BubbleBoard search={search} headerOffsetPx={168} />
    </main>
  );
}
