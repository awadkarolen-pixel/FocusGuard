import { useRef, useState, type MouseEvent } from "react";

export interface BarDatum {
  id: string | number;
  label: string;
  value: number;
  color: string;
  tooltip: string;
}

interface BarChartProps {
  data: BarDatum[];
  /** Fixed top of the value axis; defaults to an auto "nice" scale of the data. */
  max?: number;
  ariaLabel: string;
  /** Formats y-axis tick labels (default: rounded integer). */
  formatTick?: (value: number) => string;
  /** Show a value label above each bar when there are fewer than 15 bars. */
  showValues?: boolean;
  /** Formats the above-bar value labels (default: rounded integer). */
  formatValue?: (value: number) => string;
}

const WIDTH = 360;
const HEIGHT = 440;
const PAD = { top: 16, right: 10, bottom: 30, left: 38 };
const CHART_W = WIDTH - PAD.left - PAD.right;
const CHART_H = HEIGHT - PAD.top - PAD.bottom;
const TICK_SEGMENTS = 4;

/** Computes a tidy axis max + step (multiples of 1/2/5 × 10ⁿ) that covers the data. */
function niceScale(maxValue: number, targetTicks = 4): { max: number; step: number } {
  if (maxValue <= 0) return { max: 1, step: 1 };
  const rawStep = maxValue / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const niceStep = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  return { max: Math.ceil(maxValue / niceStep) * niceStep, step: niceStep };
}

/** An interactive SVG bar chart: hover a bar to highlight it and see a tooltip. */
export function BarChart({
  data,
  max,
  ariaLabel,
  formatTick = (v) => String(Math.round(v)),
  showValues = false,
  formatValue,
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(
    null,
  );

  if (data.length === 0) return null;

  const dataMax = Math.max(...data.map((d) => d.value), 0);

  // Fixed axis (e.g. 0–100 for %) when `max` is given; otherwise auto-scale to
  // the data so short sessions still produce a readable, well-proportioned chart.
  let safeTop: number;
  let ticks: number[];
  if (max !== undefined) {
    safeTop = max > 0 ? max : 1;
    ticks = Array.from(
      { length: TICK_SEGMENTS + 1 },
      (_, i) => (safeTop * i) / TICK_SEGMENTS,
    );
  } else {
    const scale = niceScale(dataMax);
    safeTop = scale.max;
    ticks = [];
    for (let v = 0; v <= safeTop + 1e-9; v += scale.step) ticks.push(v);
  }

  const slot = CHART_W / data.length;
  const barW = Math.min(slot * 0.6, 40);
  const yFor = (v: number) => PAD.top + CHART_H * (1 - v / safeTop);
  // Thin out x labels when there are many bars to avoid overlap.
  const showEveryLabel = data.length <= 12;
  const valueLabels = showValues && data.length < 15;
  const fmtValue = formatValue ?? formatTick;

  function handleMove(index: number, e: MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ index, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div className="barchart" ref={containerRef}>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
      >
        {ticks.map((t, i) => {
          const y = yFor(t);
          return (
            <g key={i}>
              <line
                className="chart-grid"
                x1={PAD.left}
                y1={y}
                x2={WIDTH - PAD.right}
                y2={y}
              />
              <text
                className="chart-axis-label"
                x={PAD.left - 5}
                y={y + 3}
                textAnchor="end"
              >
                {formatTick(t)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const x = PAD.left + slot * i + (slot - barW) / 2;
          const h = Math.max((CHART_H * d.value) / safeTop, 0);
          const y = PAD.top + CHART_H - h;
          const active = hover?.index === i;
          return (
            <g
              key={d.id}
              onMouseEnter={(e) => handleMove(i, e)}
              onMouseMove={(e) => handleMove(i, e)}
              onMouseLeave={() =>
                setHover((cur) => (cur?.index === i ? null : cur))
              }
            >
              {/* Transparent full-height hit area for easier hovering. */}
              <rect
                x={x}
                y={PAD.top}
                width={barW}
                height={CHART_H}
                fill="transparent"
              />
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={2}
                fill={d.color}
                opacity={active ? 1 : 0.85}
              />
              {valueLabels && (
                <text
                  className="chart-value-label"
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                >
                  {fmtValue(d.value)}
                </text>
              )}
              {(showEveryLabel || i % 2 === 0) && (
                <text
                  className="chart-x-label"
                  x={x + barW / 2}
                  y={PAD.top + CHART_H + 14}
                  textAnchor="middle"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          className="chart-tooltip"
          style={{ left: hover.x, top: hover.y }}
        >
          {data[hover.index].tooltip}
        </div>
      )}
    </div>
  );
}
