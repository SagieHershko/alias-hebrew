/**
 * Geometry of the 3D board, in world units (1 unit = distance between squares).
 *
 * The track is a spiral like the printed Alias board, laid out for Hebrew (RTL):
 * start at the far-right corner, run left along the far edge, down the left side,
 * right along the near edge, up the right side, then left along the middle row
 * to the ✌ finish disc. The board is sized so that exactly `target + 1` squares
 * (0 = start … target = finish) fill the whole spiral.
 */
export interface Square {
  x: number;
  z: number;
}

export interface BoardLayout {
  width: number;
  depth: number;
  squares: Square[];
  /** Free band between the middle row and the near edge, for the logo. */
  logo: { x: number; z: number; width: number; height: number };
}

const SPACING = 1;
const MARGIN = 0.75;
const ASPECT = 0.6; // depth / width
/** Gap left between the finish disc and the left column. */
const INNER_GAP = 2.2;

function polyline(width: number): Square[] {
  const d = width * ASPECT;
  const left = -width / 2 + MARGIN;
  const right = width / 2 - MARGIN;
  const far = -d / 2 + MARGIN;
  const near = d / 2 - MARGIN;
  return [
    { x: right, z: far },
    { x: left, z: far },
    { x: left, z: near },
    { x: right, z: near },
    { x: right, z: 0 },
    { x: left + INNER_GAP, z: 0 },
  ];
}

function length(points: Square[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  }
  return total;
}

/** Point at distance `dist` along the polyline. */
function pointAt(points: Square[], dist: number): Square {
  let left = dist;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= seg || i === points.length - 1) {
      const t = seg === 0 ? 0 : Math.min(1, left / seg);
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    left -= seg;
  }
  return points[points.length - 1];
}

export function computeLayout(target: number): BoardLayout {
  const wanted = target * SPACING;
  // The spiral length grows linearly with the width: binary-search the width.
  let lo = 4;
  let hi = 60;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (length(polyline(mid)) < wanted) lo = mid;
    else hi = mid;
  }
  const width = hi;
  const depth = width * ASPECT;
  const path = polyline(width);
  const total = length(path);
  const squares = Array.from({ length: target + 1 }, (_, i) => pointAt(path, (i / target) * total));

  const bandTop = 0.5;
  const bandBottom = depth / 2 - MARGIN - 0.5;
  const logoAspect = 1024 / 360;
  const logoWidth = Math.min(Math.max(0.5, (bandBottom - bandTop) * 0.8) * logoAspect, width * 0.55);
  return {
    width,
    depth,
    squares,
    logo: { x: width * 0.12, z: (bandTop + bandBottom) / 2, width: logoWidth, height: logoWidth / logoAspect },
  };
}
