
"use client";

type Point = { t: number; v: number }; // t: minutos (0..10), v: 0..1

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function pointsToPath(points: Point[], w: number, h: number, pad: number, rightPad: number) {
  if (points.length === 0) return "";
  const innerW = w - pad - rightPad;
  const innerH = h - pad * 2;

  const toX = (t: number) => pad + (t / 10) * innerW;
  const toY = (v: number) => pad + (1 - clamp01(v)) * innerH;

  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.t).toFixed(2)} ${toY(p.v).toFixed(2)}`)
    .join(" ");
}

function fmtTime(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function TrendChart({
  hotSeries,
  coolSeries,
  width = 340,
  height = 110,
  now = new Date(),
}: {
  hotSeries: Point[];
  coolSeries: Point[];
  width?: number;
  height?: number;
  now?: Date;
}) {
  const pad = 10;
  const rightPad = 34; // espaço para labels do eixo Y à direita

  const hotPath = pointsToPath(hotSeries, width, height, pad, rightPad);
  const coolPath = pointsToPath(coolSeries, width, height, pad, rightPad);

  // horários: agora, -5, -10
  const t10 = new Date(now.getTime() - 10 * 60 * 1000);
  const t5 = new Date(now.getTime() - 5 * 60 * 1000);
  const t0 = now;

  const plotRightX = width - rightPad;

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-xs font-semibold tracking-widest text-gray-700">ÚLTIMOS 10 MIN</div>
        <div className="flex gap-3 text-[11px] text-gray-600">
          <span>
            <span
              className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
              style={{ background: "var(--hot-br)" }}
            />
            quente
          </span>
          <span>
            <span
              className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
              style={{ background: "var(--cool-br)" }}
            />
            frio
          </span>
        </div>
      </div>

      {/* Sem contorno (sem border) */}
      <div className="w-full rounded-xl bg-white/70 px-2 py-2">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-label="Gráfico dos últimos 10 minutos"
        >
          {/* grid leve */}
          <g opacity="0.75">
            {[0, 0.5, 1].map((v) => {
              const y = pad + (1 - v) * (height - pad * 2);
              return (
                <line
                  key={v}
                  x1={pad}
                  y1={y}
                  x2={plotRightX}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              );
            })}
          </g>

          {/* eixo Y à direita (0%..100%) */}
          <g fill="#6b7280" fontSize="10">
            <text x={plotRightX + 6} y={pad + 3}>
              100%
            </text>
            <text x={plotRightX + 6} y={pad + (height - pad * 2) / 2 + 3}>
              50%
            </text>
            <text x={plotRightX + 6} y={height - pad}>
              0%
            </text>
          </g>

          {/* linhas */}
          <path d={coolPath} fill="none" stroke="var(--cool-br)" strokeWidth="2.2" />
          <path d={hotPath} fill="none" stroke="var(--hot-br)" strokeWidth="2.2" />

          {/* pontos finais */}
          {hotSeries.length > 0 && (
            <circle
              cx={plotRightX}
              cy={pad + (1 - hotSeries[hotSeries.length - 1]!.v) * (height - pad * 2)}
              r="3.5"
              fill="var(--hot-br)"
            />
          )}
          {coolSeries.length > 0 && (
            <circle
              cx={plotRightX}
              cy={pad + (1 - coolSeries[coolSeries.length - 1]!.v) * (height - pad * 2)}
              r="3.5"
              fill="var(--cool-br)"
            />
          )}

          {/* eixo X com horas */}
          <g fill="#6b7280" fontSize="10">
            <text x={pad} y={height - 2}>
              {fmtTime(t10)}
            </text>
            <text x={width / 2 - 12} y={height - 2}>
              {fmtTime(t5)}
            </text>
            <text x={plotRightX - 22} y={height - 2}>
              {fmtTime(t0)}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
