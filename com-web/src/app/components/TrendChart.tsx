"use client";

type Point = { t: number; v: number }; // t: minutos (0..15), v: 0..1
type Dir = "up" | "down";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function fmtTime(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function pointsToPath(points: Point[], w: number, h: number, pad: number) {
  if (points.length === 0) return "";
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const toX = (t: number) => pad + (t / 15) * innerW;
  const toY = (v: number) => pad + (1 - clamp01(v)) * innerH;

  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.t).toFixed(2)} ${toY(p.v).toFixed(2)}`)
    .join(" ");
}

function xAt(minutes: number, w: number, pad: number) {
  const innerW = w - pad * 2;
  return pad + (minutes / 15) * innerW;
}

function yAt(v: number, h: number, pad: number) {
  const innerH = h - pad * 2;
  return pad + (1 - clamp01(v)) * innerH;
}

function boostedPercent(points: Point[], boost = 1.9) {
  if (points.length < 2) return 0;
  const first = clamp01(points[0]!.v);
  const last = clamp01(points[points.length - 1]!.v);
  const delta = Math.abs(last - first);
  return Math.max(0, Math.min(100, Math.round(delta * 100 * boost)));
}

function arrow(dir: Dir) {
  return dir === "up" ? "↑" : "↓";
}

export default function TrendChart({
  hot,
  cool,
  width = 360,
  height = 190,
  now = new Date(),
}: {
  hot: { name: string; points: Point[] };
  cool: { name: string; points: Point[] };
  width?: number;
  height?: number;
  now?: Date;
}) {
  const pad = 12;

  const hotPath = pointsToPath(hot.points, width, height, pad);
  const coolPath = pointsToPath(cool.points, width, height, pad);

  const hotLast = hot.points[hot.points.length - 1]?.v ?? 0.5;
  const coolLast = cool.points[cool.points.length - 1]?.v ?? 0.5;

  const hotPct = boostedPercent(hot.points, 1.9);
  const coolPct = boostedPercent(cool.points, 1.9);

  const hotY = yAt(hotLast, height, pad);
  const coolY = yAt(coolLast, height, pad);

  // evitar overlap dos labels
  const tooClose = Math.abs(hotY - coolY) < 36;
  const hotDY = tooClose && hotY <= coolY ? -18 : 0;
  const coolDY = tooClose && coolY < hotY ? 18 : 0;

  // eixo X 4 tempos
  const t15 = new Date(now.getTime() - 15 * 60 * 1000);
  const t10 = new Date(now.getTime() - 10 * 60 * 1000);
  const t5 = new Date(now.getTime() - 5 * 60 * 1000);
  const t0 = now;

  // label box (posição “no final”)
  const labelW = 118;
  const labelH = 36;
  const labelX = width - pad - labelW; // encosta à direita dentro do plot

  return (
    <div className="w-full">
      <div className="w-full rounded-xl bg-white/70 px-2 py-2">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-label="Gráfico de tendência"
        >
          {/* grid horizontal leve */}
          <g opacity="0.75">
            {[0.2, 0.5, 0.8].map((v) => {
              const y = yAt(v, height, pad);
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

          {/* linhas */}
          <path d={coolPath} fill="none" stroke="var(--cool-br)" strokeWidth="2.2" />
          <path d={hotPath} fill="none" stroke="var(--hot-br)" strokeWidth="2.2" />

          {/* pontos finais */}
          <circle cx={xAt(15, width, pad)} cy={coolY} r="3.6" fill="var(--cool-br)" />
          <circle cx={xAt(15, width, pad)} cy={hotY} r="3.6" fill="var(--hot-br)" />

          {/* Labels no final, com cor correspondente */}
          {/* HOT */}
          <g transform={`translate(${labelX}, ${hotY + hotDY - labelH / 2})`}>
            <rect x={0} y={0} width={labelW} height={labelH} rx={9} fill="rgba(255,255,255,0.85)" />
            {/* barra/acento na cor da linha */}
            <rect x={0} y={0} width={4} height={labelH} rx={9} fill="var(--hot-br)" />
            <text x={10} y={14} fontSize="10" fill="#374151">
              {hot.name}
            </text>
            <text x={10} y={29} fontSize="12" fill="var(--hot-br)" fontWeight={800}>
              {arrow("up")}
              {hotPct}%
            </text>
          </g>

          {/* COOL */}
          <g transform={`translate(${labelX}, ${coolY + coolDY - labelH / 2})`}>
            <rect x={0} y={0} width={labelW} height={labelH} rx={9} fill="rgba(255,255,255,0.85)" />
            <rect x={0} y={0} width={4} height={labelH} rx={9} fill="var(--cool-br)" />
            <text x={10} y={14} fontSize="10" fill="#374151">
              {cool.name}
            </text>
            <text x={10} y={29} fontSize="12" fill="var(--cool-br)" fontWeight={800}>
              {arrow("down")}
              {coolPct}%
            </text>
          </g>

          {/* eixo X com 4 horários */}
          <g fill="#6b7280" fontSize="10">
            <text x={xAt(0, width, pad)} y={height - 2}>
              {fmtTime(t15)}
            </text>
            <text x={xAt(5, width, pad) - 10} y={height - 2}>
              {fmtTime(t10)}
            </text>
            <text x={xAt(10, width, pad) - 10} y={height - 2}>
              {fmtTime(t5)}
            </text>
            <text x={xAt(15, width, pad) - 22} y={height - 2}>
              {fmtTime(t0)}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
