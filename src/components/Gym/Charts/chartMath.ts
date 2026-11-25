/**
 * chartMath.ts — ZenTrack Mobile
 * Shared mathematical algorithms, SVG coordinate builders, Bezier arc-length estimators,
 * and semantic color interpolators for Gym charts.
 */
import { DARK_TOKENS, LIGHT_TOKENS } from '../../../theme/tokens';

/** Epley 1-Rep Max formula */
export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

/** Formats YYYY-MM-DD to "MMM D" e.g. "Jul 14" */
export function formatChartDate(dateStr: string): string {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[(m || 1) - 1]} ${d || ''}`;
}

/** Calculates 4-level workout heatmap intensity */
export function getHeatmapIntensityColor(volume: number, isDark: boolean = true): string {
  const t = isDark ? DARK_TOKENS : LIGHT_TOKENS;
  if (volume <= 0) return t.bg.elevated;
  if (volume < 1000) return t.accent.secondaryDim;
  if (volume < 3000) return t.accent.primaryDim;
  return t.accent.primary;
}

/** Builds an SVG line path across an array of numeric values */
export function buildSvgLinePath(
  values: number[],
  width: number,
  height: number,
  maxVal: number,
  padX: number = 10,
  padY: number = 10
): string {
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const step = chartW / Math.max(values.length - 1, 1);

  return values
    .map((v, i) => {
      const x = padX + i * step;
      const y = padY + chartH - (maxVal > 0 ? (v / maxVal) * chartH : 0);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Builds a smooth cubic bezier SVG curve from points */
export function generateSmoothSvgPath(coords: { x: number; y: number }[]): string {
  if (!coords || coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;

  let path = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const midX = (curr.x + next.x) / 2;
    path += ` C ${midX.toFixed(1)},${curr.y.toFixed(1)} ${midX.toFixed(1)},${next.y.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`;
  }
  return path;
}

/** Numerically integrates cubic Bezier curve length across 8 chord steps per segment */
export function estimateSmoothCurveLength(coords: { x: number; y: number }[]): number {
  if (!coords || coords.length <= 1) return 0;
  let total = 0;
  const STEPS = 8;

  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p3 = coords[i + 1];
    const midX = (p0.x + p3.x) / 2;
    const p1 = { x: midX, y: p0.y };
    const p2 = { x: midX, y: p3.y };

    let prevX = p0.x;
    let prevY = p0.y;
    for (let s = 1; s <= STEPS; s++) {
      const t = s / STEPS;
      const mt = 1 - t;
      const x =
        mt * mt * mt * p0.x +
        3 * mt * mt * t * p1.x +
        3 * mt * t * t * p2.x +
        t * t * t * p3.x;
      const y =
        mt * mt * mt * p0.y +
        3 * mt * mt * t * p1.y +
        3 * mt * t * t * p2.y +
        t * t * t * p3.y;
      total += Math.hypot(x - prevX, y - prevY);
      prevX = x;
      prevY = y;
    }
  }
  return Math.max(1, Math.ceil(total * 1.04));
}

/** Measures total Euclidean length of a polyline point array */
export function estimatePolylineLength(coords: { x: number; y: number }[]): number {
  if (!coords || coords.length <= 1) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += Math.hypot(coords[i].x - coords[i - 1].x, coords[i].y - coords[i - 1].y);
  }
  return Math.max(1, Math.ceil(total * 1.04));
}

/** Builds cubic Bezier line path, closed gradient area path, and exact strokeDasharray length */
export function buildSmoothBezierCurve(
  coords: { x: number; y: number }[],
  areaBottomY: number
): { linePath: string; areaPath: string; pathLength: number } {
  if (!coords || coords.length === 0) {
    return { linePath: '', areaPath: '', pathLength: 0 };
  }
  const linePath = generateSmoothSvgPath(coords);
  const pathLength = estimateSmoothCurveLength(coords);
  if (coords.length === 1) {
    const p = coords[0];
    return {
      linePath: `M 0,${p.y.toFixed(1)} L ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
      areaPath: `M 0,${p.y.toFixed(1)} L ${p.x.toFixed(1)},${p.y.toFixed(1)} L ${p.x.toFixed(1)},${areaBottomY} L 0,${areaBottomY} Z`,
      pathLength: Math.max(1, Math.ceil(p.x)),
    };
  }
  const first = coords[0];
  const last = coords[coords.length - 1];
  const areaPath = `${linePath} L ${last.x.toFixed(1)},${areaBottomY.toFixed(1)} L ${first.x.toFixed(1)},${areaBottomY.toFixed(1)} Z`;
  return { linePath, areaPath, pathLength };
}
