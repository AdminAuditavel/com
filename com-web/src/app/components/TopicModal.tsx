"use client";

type TopicState = "hot" | "steady" | "cool";

export type TopicDetail = {
  id: string;
  label: string;
  state: TopicState;
};

function stateLabel(s: TopicState) {
  if (s === "hot") return "Aquecendo";
  if (s === "cool") return "Esfriando";
  return "Estável";
}

export default function TopicModal({
  open,
  topic,
  onClose,
}: {
  open: boolean;
  topic: TopicDetail | null;
  onClose: () => void;
}) {
  if (!open || !topic) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar"
        onClick={onClose}
      />

      {/* sheet */}
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold leading-tight">{topic.label}</h3>
            <p className="mt-1 text-sm text-gray-600">{stateLabel(topic.state)}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-3 py-1 text-sm"
          >
            Fechar
          </button>
        </div>

        {/* mini “linha” placeholder */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold tracking-widest text-gray-500">
            ÚLTIMAS HORAS
          </p>
          <div className="mt-3 h-10 w-full rounded-lg bg-white border border-gray-200" />
          <p className="mt-2 text-xs text-gray-500">
            (placeholder do mini gráfico)
          </p>
        </div>

        {/* Por que está em alta */}
        <div className="mt-4">
          <p className="text-xs font-semibold tracking-widest text-gray-500">
            POR QUE ESTÁ EM ALTA
          </p>

          <div className="mt-3 space-y-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-3">
              <p className="text-sm font-medium">Driver principal</p>
              <p className="text-sm text-gray-600">
                Comentários ao vivo / repercussão recente (simulado)
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-3">
              <p className="text-sm font-medium">Evidências</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-gray-600 space-y-1">
                <li>Fonte: YouTube — há 12 min</li>
                <li>Buscas relacionadas — há 28 min</li>
                <li>Notícia recente — há 45 min</li>
              </ul>
            </div>

            <button
              type="button"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
            >
              Como calculamos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
