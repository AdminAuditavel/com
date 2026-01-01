"use client";

type Point = { t: number; v: number }; // t: minutos (0..15), v: 0..1
type Dir = "up" | "down";

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

// Percentual “mais impactante”:
// usa variação absoluta no período e amplifica um pouco.
// Depois, clamp 0..100.
function boostedPercent(points: Point[], boost = 1.35) {
  if (points.length < 2) return 0;
  const first = clamp01(points[0]!.v);
  const last = clamp01(points[points.length - 1]!.v);

  const delta = Math.abs(last - first); // 0..1
  return Math.max(0, Math.min(100, Math.round(delta * 100 * boost)));
}

function arrow(dir: Dir) {
  return dir === "up" ? "↑" : "↓";
}

export default function TrendChart({
  hot,
  cool,
  width = 340,
  height = 180,
  now = new Date(),
}: {
  hot: { name: string; points: Point[] };
  cool: { name: string; points: Point[] };
  width?: number;
  height?: number;
  now?: Date;
}) {
  const pad = 10;

  // espaço para labels à direita (2 linhas)
  const rightPad = 110;
  const plotRightX = width - rightPad;

  const innerW = plotRightX - pad;
  const xAt = (minutes: number) => pad + (minutes / 15) * innerW;
  const yAt = (v: number) => pad + (1 - clamp01(v)) * (height - pad * 2);

  const hotPath = pointsToPath(hot.points, width, height, pad, rightPad);
  const coolPath = pointsToPath(cool.points, width, height, pad, rightPad);

  const hotLast = hot.points[hot.points.length - 1]?.v ?? 0.5;
  const coolLast = cool.points[cool.points.length - 1]?.v ?? 0.5;

  const hotPct = boostedPercent(hot.points, 1.6);
  const coolPct = boostedPercent(cool.points, 1.6);

  // Eixo X: 4 tempos (-15, -10, -5, agora)
  const t15 = new Date(now.getTime() - 15 * 60 * 1000);
  const t10 = new Date(now.getTime() - 10 * 60 * 1000);
  const t5 = new Date(now.getTime() - 5 * 60 * 1000);
  const t0 = now;

  return (
    <div className="w-full">
      <div className="w-full rounded-xl bg-white/70 px-2 py-2">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {/* grid leve horizontal */}
          <g opacity="0.75">
            {[0.2, 0.5, 0.8].map((v) => {
              const y = yAt(v);
              return <line key={v} x1={pad} y1={y} x2={plotRightX} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
            })}
          </g>

          {/* linhas */}
          <path d={coolPath} fill="none" stroke="var(--cool-br)" strokeWidth="2.2" />
          <path d={hotPath} fill="none" stroke="var(--hot-br)" strokeWidth="2.2" />

          {/* pontos finais */}
          <circle cx={plotRightX} cy={yAt(coolLast)} r="3.5" fill="var(--cool-br)" />
          <circle cx={plotRightX} cy={yAt(hotLast)} r="3.5" fill="var(--hot-br)" />

          {/* labels à direita: Nome em cima, percentual embaixo (negrito) */}
          {(() => {
            const cx = plotRightX + 10;

            // offsets para evitar sobreposição quando hot/cool ficarem muito perto
            const hotY = yAt(hotLast);
            const coolY = yAt(coolLast);
            const tooClose = Math.abs(hotY - coolY) < 32;

            const hotOffset = tooClose && hotY <= coolY ? -16 : 0;
            const coolOffset = tooClose && coolY < hotY ? 16 : 0;

            return (
              <>
                {/* HOT */}
                <g transform={`translate(${cx}, ${hotY + hotOffset})`}>
                  <text x={0} y={-6} fontSize="10" fill="#374151">
                    {hot.name}
                  </text>
                  <text x={0} y={10} fontSize="12" fill="#111827" fontWeight={700}>
                    {arrow("up")}
                    {hotPct}%
                  </text>
                </g>

                {/* COOL */}
                <g transform={`translate(${cx}, ${coolY + coolOffset})`}>
                  <text x={0} y={-6} fontSize="10" fill="#374151">
                    {cool.name}
                  </text>
                  <text x={0} y={10} fontSize="12" fill="#111827" fontWeight={700}>
                    {arrow("down")}
                    {coolPct}%
                  </text>
                </g>
              </>
            );
          })()}

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
