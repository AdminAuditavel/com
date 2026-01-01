"use client";

type Point = { t: number; v: number }; // t: minutos (0..15), v: 0..1
type Series = { name: string; color: string; dir: "up" | "down" | "steady"; points: Point[] };

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

function pctFromSeries(points: Point[]) {
  // “percentual” visual baseado em 0..1 => 0..100
  const last = points[points.length - 1]?.v ?? 0;
  return Math.round(clamp01(last) * 100);
}

function arrow(dir: Series["dir"]) {
  if (dir === "up") return "↑";
  if (dir === "down") return "↓";
  return "•";
}

export default function TrendChart({
  hot,
  cool,
  steady,
  width = 340,
  height = 140,
  now = new Date(),
}: {
  hot: { name: string; points: Point[] };
  cool: { name: string; points: Point[] };
  steady: { name: string; points: Point[] };
  width?: number;
  height?: number;
  now?: Date;
}) {
  const pad = 10;
  const rightPad = 78; // espaço para labels na ponta direita

  const plotRightX = width - rightPad;

  const series: Series[] = [
    { name: hot.name, color: "var(--hot-br)", dir: "up", points: hot.points },
    { name: cool.name, color: "var(--cool-br)", dir: "down", points: cool.points },
    { name: steady.name, color: "var(--steady-br, #6b7280)", dir: "steady", points: steady.points },
  ];

  const paths = series.map((s) => ({
    ...s,
    path: pointsToPath(s.points, width, height, pad, rightPad),
    pct: pctFromSeries(s.points),
    lastV: s.points[s.points.length - 1]?.v ?? 0.5,
  }));

  // 4 tempos no eixo X: -15, -10, -5, agora
  const t15 = new Date(now.getTime() - 15 * 60 * 1000);
  const t10 = new Date(now.getTime() - 10 * 60 * 1000);
  const t5 = new Date(now.getTime() - 5 * 60 * 1000);
  const t0 = now;

  const innerW = plotRightX - pad;
  const xAt = (minutes: number) => pad + (minutes / 15) * innerW;

  const yAt = (v: number) => pad + (1 - clamp01(v)) * (height - pad * 2);

  return (
    <div className="w-full">
      {/* legenda curta */}
      <div className="flex items-baseline justify-end mb-2">
        <div className="flex gap-3 text-[11px] text-gray-600">
          <span>
            <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: "var(--hot-br)" }} />
            quente
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: "var(--cool-br)" }} />
            frio
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: "var(--steady-br, #6b7280)" }} />
            estável
          </span>
        </div>
      </div>

      <div className="w-full rounded-xl bg-white/70 px-2 py-2">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {/* grid leve horizontal (sem eixo Y) */}
          <g opacity="0.75">
            {[0.2, 0.5, 0.8].map((v) => {
              const y = yAt(v);
              return <line key={v} x1={pad} y1={y} x2={plotRightX} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
            })}
          </g>

          {/* linhas */}
          {paths.map((s) => (
            <path key={s.name} d={s.path} fill="none" stroke={s.color} strokeWidth="2.2" />
          ))}

          {/* pontos finais + labels na ponta */}
          {paths.map((s, idx) => {
            const cy = yAt(s.lastV);
            const cx = plotRightX;

            // pequeno offset vertical para evitar que 3 labels se sobreponham quando os valores estão próximos
            const labelYOffset = (idx - 1) * 12;

            return (
              <g key={`${s.name}-end`}>
                <circle cx={cx} cy={cy} r="3.5" fill={s.color} />
                <text
                  x={cx + 8}
                  y={cy + 4 + labelYOffset}
                  fontSize="10"
                  fill="#374151"
                >
                  {arrow(s.dir)} {s.pct}% {s.name}
                </text>
              </g>
            );
          })}

          {/* eixo X com 4 horas */}
          <g fill="#6b7280" fontSize="10">
            <text x={xAt(0)} y={height - 2}>
              {fmtTime(t15)}
            </text>
            <text x={xAt(5) - 10} y={height - 2}>
              {fmtTime(t10)}
            </text>
            <text x={xAt(10) - 10} y={height - 2}>
              {fmtTime(t5)}
            </text>
            <text x={xAt(15) - 22} y={height - 2}>
              {fmtTime(t0)}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
