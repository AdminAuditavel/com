"use client";

type Point = { t: number; v: number }; // t: minutos (0..15), v: 0..1

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function pointsToPath(points: Point[], w: number, h: number, pad: number, rightPad: number) {
  if (points.length === 0) return "";
  const innerW = w - pad - rightPad;
  const innerH = h - pad * 2;

  const toX = (t: number) => pad + (t / 15) * innerW;
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
  const rightPad = 34;

  const hotPath = pointsToPath(hotSeries, width, height, pad, rightPad);
  const coolPath = pointsToPath(coolSeries, width, height, pad, rightPad);

  // horários: agora, -7.5, -15 (arredondando para minutos inteiros)
  const t15 = new Date(now.getTime() - 15 * 60 * 1000);
  const t8 = new Date(now.getTime() - 8 * 60 * 1000);
  const t0 = now;

  const plotRightX = width - rightPad;

  return (
    <div className="w-full">
      {/* legenda simples, sem “últimos 10 min” */}
      <div className="flex items-baseline justify-end mb-2">
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

      <div className="w-full rounded-xl bg-white/70 px-2 py-2">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-label="Gráfico de tendência"
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

          {/* eixo Y à direita */}
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

          {/* eixo X com horas (15min) */}
          <g fill="#6b7280" fontSize="10">
            <text x={pad} y={height - 2}>
              {fmtTime(t15)}
            </text>
            <text x={width / 2 - 12} y={height - 2}>
              {fmtTime(t8)}
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
