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

const DATA: CategoryBlock[] = [
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

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Topo */}
      <header className="px-5 pt-7 pb-4">
        <h1 className="text-center text-xl font-semibold tracking-tight">
          O que está explodindo agora
        </h1>
        <p className="text-center text-xs text-gray-500 mt-1">
          Atualizado continuamente
        </p>
      </header>

      {/* Conteúdo */}
      <section className="px-5 pb-10 space-y-10">
        {DATA.map((cat) => (
          <div key={cat.title}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold tracking-widest text-gray-500">
                {cat.title}
              </h2>
            </div>

            {/* “Campo” de bolhas */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap gap-3">
                {cat.items.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={[
                      "rounded-full border border-gray-200 bg-white",
                      "flex flex-col items-center justify-center",
                      "shadow-sm active:scale-[0.98] transition",
                      "select-none",
                      sizeClasses(b.size),
                    ].join(" ")}
                    aria-label={`${b.label} — ${stateLabel(b.state)}`}
                    onClick={() => {
                      // no próximo passo: abrir detalhe
                      alert(`${b.label} — ${stateLabel(b.state)}`);
                    }}
                  >
                    <span className="font-medium leading-tight text-center px-2">
                      {b.label}
                    </span>
                    <span className="mt-1 text-[10px] text-gray-500">
                      {stateLabel(b.state)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
