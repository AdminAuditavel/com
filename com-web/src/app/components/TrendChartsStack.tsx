"use client";

type Point = { t: number; v: number }; // t: minutos (0..15), v: 0..1

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function fmtTime(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function xAt(minutes: number, w: number, pad: number) {
  const innerW = w - pad * 2;
  return pad + (minutes / 15) * innerW;
}

function yAt(v: number, h: number, pad: number) {
  const innerH = h - pad * 2;
  return pad + (1 - clamp01(v)) * innerH;
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

function boostedPercent(points: Point[], boost = 2.4) {
  if (points.length < 2) return 0;
  const first = clamp01(points[0]!.v);
  const last = clamp01(points[points.length - 1]!.v);
  const delta = Math.abs(last - first);
  return Math.max(0, Math.min(100, Math.round(delta * 100 * boost)));
}

function MiniChart({
  name,
  direction,
  color,
  points,
  width,
  height,
  now,
  showXAxis,
  pad,
}: {
  name: string;
  direction: "up" | "down";
  color: string;
  points: Point[];
  width: number;
  height: number;
  now: Date;
  showXAxis: boolean;
  pad: number;
}) {
  const path = pointsToPath(points, width, height, pad);
  const lastV = points[points.length - 1]?.v ?? 0.5;

  const endX = xAt(15, width, pad);
  const endY = yAt(lastV, height, pad);

  const pct = boostedPercent(points, 2.4);
  const arrow = direction === "up" ? "↑" : "↓";

  const cardW = 150;
  const cardH = 42;
  const cardX = width - pad - cardW;

  let cardY = endY - cardH / 2;
  const axisH = showXAxis ? 14 : 0;
  const minY = pad;
  const maxY = height - pad - axisH - cardH;
  cardY = Math.max(minY, Math.min(maxY, cardY));

  const t15 = new Date(now.getTime() - 15 * 60 * 1000);
  const t10 = new Date(now.getTime() - 10 * 60 * 1000);
  const t5 = new Date(now.getTime() - 5 * 60 * 1000);
  const t0 = now;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <g opacity="0.75">
        {[0.2, 0.5, 0.8].map((v) => {
          const y = yAt(v, height, pad);
          return <line key={v} x1={pad} y1={y} x2={width - pad} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
        })}
      </g>

      <path d={path} fill="none" stroke={color} strokeWidth="2.4" />
      <circle cx={endX} cy={endY} r="3.8" fill={color} />

      <g transform={`translate(${cardX}, ${cardY})`}>
        <rect x={0} y={0} width={cardW} height={cardH} rx={12} fill="rgba(255,255,255,0.92)" />
        <text x={12} y={17} fontSize="11" fill="#374151">
          {name}
        </text>
        <text x={12} y={36} fontSize="14" fill={color} fontWeight={800}>
          {arrow}
          {pct}%
        </text>
      </g>

      {showXAxis && (
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
      )}
    </svg>
  );
}

export default function TrendChartsStack({
  hot,
  cool,
  now = new Date(),
  width = 360,
  hotHeight = 130,
  coolHeight = 145,
  overlapPx = 70, // <- aproxima (sobrepõe) o de baixo
}: {
  hot: { name: string; points: Point[] };
  cool: { name: string; points: Point[] };
  now?: Date;
  width?: number;
  hotHeight?: number;
  coolHeight?: number;
  overlapPx?: number;
}) {
  const pad = 10; // menor para reduzir “ar” interno

  return (
    <div className="w-full rounded-xl bg-white/70 px-2 py-1">
      <div className="flex flex-col">
        <MiniChart
          name={hot.name}
          direction="up"
          color="var(--hot-br)"
          points={hot.points}
          width={width}
          height={hotHeight}
          now={now}
          showXAxis={false}
          pad={pad}
        />

        {/* aproxima o segundo subindo */}
        <div style={{ marginTop: -overlapPx }}>
          <MiniChart
            name={cool.name}
            direction="down"
            color="var(--cool-br)"
            points={cool.points}
            width={width}
            height={coolHeight}
            now={now}
            showXAxis={true}
            pad={pad}
          />
        </div>
      </div>
    </div>
  );
}
