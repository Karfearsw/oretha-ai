export function Sparkline({
  data,
  up = true,
  width = 64,
  height = 24,
}: {
  data: number[];
  up?: boolean;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const color = up ? "#34d399" : "#f87271";
  return (
    <svg width={width} height={height} aria-hidden>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrendChart({
  data,
  height = 160,
}: {
  data: number[];
  height?: number;
}) {
  const width = 320;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 24) - 12;
    return { x, y };
  });
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D4A24E" stopOpacity="0.35" />
          <stop offset="1" stopColor="#D4A24E" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#trend-fill)" />
      <polyline
        points={line}
        fill="none"
        stroke="#D4A24E"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={pts[pts.length - 1].x}
        cy={pts[pts.length - 1].y}
        r="4"
        fill="#D4A24E"
      />
    </svg>
  );
}
