import type { SessionHistoryItem } from "../types";
import { SCORE_COLORS, scoreClass } from "../lib/score";

// viewBox coordinate space; the SVG scales to its container width.
const WIDTH = 320;
const HEIGHT = 150;
const PAD = { top: 12, right: 10, bottom: 24, left: 28 };
const CHART_W = WIDTH - PAD.left - PAD.right;
const CHART_H = HEIGHT - PAD.top - PAD.bottom;
const GRID_LINES = [0, 25, 50, 75, 100];

/** A small bar chart of focus % across recent sessions (oldest → newest). */
export function FocusChart({ sessions }: { sessions: SessionHistoryItem[] }) {
  if (sessions.length === 0) return null;

  // Incoming sessions are newest-first; reverse so the trend reads left→right.
  const data = [...sessions].reverse();
  const slot = CHART_W / data.length;
  const barW = Math.min(slot * 0.6, 36);

  const yFor = (pct: number) => PAD.top + CHART_H * (1 - pct / 100);

  return (
    <div className="chart">
      <div className="chart-caption">Focus % — recent sessions</div>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Bar chart of focus percentage for recent sessions"
      >
        {GRID_LINES.map((value) => {
          const y = yFor(value);
          return (
            <g key={value}>
              <line
                className="chart-grid"
                x1={PAD.left}
                y1={y}
                x2={WIDTH - PAD.right}
                y2={y}
              />
              <text
                className="chart-axis-label"
                x={PAD.left - 4}
                y={y + 3}
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          );
        })}

        {data.map((session, i) => {
          const x = PAD.left + slot * i + (slot - barW) / 2;
          const barH = (CHART_H * session.focus_percentage) / 100;
          const y = PAD.top + CHART_H - barH;
          return (
            <g key={session.id}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={2}
                fill={SCORE_COLORS[scoreClass(session.focus_percentage)]}
              />
              <text
                className="chart-value-label"
                x={x + barW / 2}
                y={y - 3}
                textAnchor="middle"
              >
                {Math.round(session.focus_percentage)}
              </text>
              <text
                className="chart-x-label"
                x={x + barW / 2}
                y={PAD.top + CHART_H + 12}
                textAnchor="middle"
              >
                #{session.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
