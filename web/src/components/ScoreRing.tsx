interface ScoreRingProps {
  size: number;
  strokeWidth: number;
  score: number; // 0-100
  color: string;
  trackColor?: string;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
}

export function ScoreRing({ size, strokeWidth, score, color, trackColor = 'var(--surface2)', label, sublabel }: ScoreRingProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - circ * (Math.max(0, Math.min(100, score)) / 100);
  const c = size / 2;

  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .4s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        {label}
        {sublabel}
      </div>
    </div>
  );
}
