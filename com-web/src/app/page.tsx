"use client";

import { useState } from "react";
import BubbleBoard from "@/app/components/BubbleBoard";

export default function Home() {
  const [search, setSearch] = useState("");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* iOS-like top bar (title + search) */}
      <header className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-3">
          <h1 className="text-center text-[17px] font-semibold tracking-tight">
            O que está explodindo agora
          </h1>
          <p className="text-center text-[12px] text-slate-500 mt-1">
            Atualizado continuamente
          </p>

          <div className="mt-3 relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              ⌕
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tema ou categoria..."
              className="w-full h-11 rounded-2xl border border-slate-200/70 bg-white/70 pl-9 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        </div>
      </header>

      <BubbleBoard search={search} headerOffsetPx={148} />
    </main>
  );
}
