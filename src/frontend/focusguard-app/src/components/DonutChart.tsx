export interface DonutSegment {
  label: string;
  value: number;
  /** Preformatted text shown in the legend (e.g. "1h 30m"). */
  display: string;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
  ariaLabel: string;
}

const SIZE = 180;
const STROKE = 26;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const CENTER = SIZE / 2;

/** A donut chart for a small number of segments, with a centered value and legend. */
export function DonutChart({
  segments,
  centerValue,
  centerLabel,
  ariaLabel,
}: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let acc = 0;

  return (
    <div className="donut">
      <svg
        className="donut-svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={ariaLabel}
      >
        <circle
          className="donut-track"
          cx={CENTER}
          cy={CENTER}
          r={R}
          fill="none"
          strokeWidth={STROKE}
        />
        <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
          {total > 0 &&
            segments.map((seg) => {
              const len = (seg.value / total) * C;
              const circle = (
                <circle
                  key={seg.label}
                  cx={CENTER}
                  cy={CENTER}
                  r={R}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-acc}
                />
              );
              acc += len;
              return circle;
            })}
        </g>
        <text
          className="donut-center-value"
          x={CENTER}
          y={CENTER - 6}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {centerValue}
        </text>
        <text
          className="donut-center-label"
          x={CENTER}
          y={CENTER + 16}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {centerLabel}
        </text>
      </svg>

      <div className="donut-legend">
        {segments.map((seg) => (
          <div className="donut-legend-item" key={seg.label}>
            <span className="donut-dot" style={{ background: seg.color }} />
            <span>{seg.label}</span>
            <strong>{seg.display}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
