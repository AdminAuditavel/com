"use client";

type Point = { t: number; v: number }; // t: minutos (0..10), v: 0..1

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function pointsToPath(points: Point[], w: number, h: number, pad: number) {
  if (points.length === 0) return "";
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const toX = (t: number) => pad + (t / 10) * innerW;
  const toY = (v: number) => pad + (1 - clamp01(v)) * innerH;

  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.t).toFixed(2)} ${toY(p.v).toFixed(2)}`)
    .join(" ");
}

export default function TrendChart({
  hotSeries,
  coolSeries,
  width = 340,
  height = 110,
}: {
  hotSeries: Point[];
  coolSeries: Point[];
  width?: number;
  height?: number;
}) {
  const pad = 10;

  const hotPath = pointsToPath(hotSeries, width, height, pad);
  const coolPath = pointsToPath(coolSeries, width, height, pad);

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

      <div className="w-full rounded-xl border border-gray-200 bg-white/70 px-2 py-2">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-label="Gráfico dos últimos 10 minutos"
        >
          {/* grid leve */}
          <g opacity="0.8">
            {[0, 0.5, 1].map((v) => {
              const y = pad + (1 - v) * (height - pad * 2);
              return (
                <line
                  key={v}
                  x1={pad}
                  y1={y}
                  x2={width - pad}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              );
            })}
          </g>

          {/* eixo X: -10m, -5m, agora */}
          <g fill="#6b7280" fontSize="10">
            <text x={pad} y={height - 2}>
              -10m
            </text>
            <text x={width / 2 - 10} y={height - 2}>
              -5m
            </text>
            <text x={width - pad - 18} y={height - 2}>
              agora
            </text>
          </g>

          {/* linhas */}
          <path d={coolPath} fill="none" stroke="var(--cool-br)" strokeWidth="2.2" />
          <path d={hotPath} fill="none" stroke="var(--hot-br)" strokeWidth="2.2" />

          {/* pontos finais */}
          {hotSeries.length > 0 && (
            <circle
              cx={width - pad}
              cy={pad + (1 - hotSeries[hotSeries.length - 1]!.v) * (height - pad * 2)}
              r="3.5"
              fill="var(--hot-br)"
            />
          )}
          {coolSeries.length > 0 && (
            <circle
              cx={width - pad}
              cy={pad + (1 - coolSeries[coolSeries.length - 1]!.v) * (height - pad * 2)}
              r="3.5"
              fill="var(--cool-br)"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
