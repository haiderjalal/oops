import { PLACE_TYPE_META } from "@/constants/placeTypes";
import type { PlaceType } from "@/types/domain";
import { cn } from "@/utils/cn";

/**
 * Generated "postcard illustration" shown when a place has no photo yet. It is NOT a photo of the
 * place — just a deterministic scrap of scenery (sky, sun, hills, dashed path) derived from the
 * slug, so every entry still looks intentional without hotlinking stock images.
 */

const PALETTES = [
  { sky: ["#f2c66d", "#fa6b4a"], sun: "#fff3d4", far: "#a8a4e6", mid: "#164f68", near: "#0d3447" },
  { sky: ["#a8a4e6", "#f8f4eb"], sun: "#fa6b4a", far: "#2a6f8f", mid: "#164f68", near: "#202c37" },
  { sky: ["#2a6f8f", "#f2c66d"], sun: "#fffdf8", far: "#a8a4e6", mid: "#fa6b4a", near: "#164f68" },
  { sky: ["#fa6b4a", "#f2c66d"], sun: "#fffdf8", far: "#164f68", mid: "#0d3447", near: "#202c37" },
  { sky: ["#f8f4eb", "#a8a4e6"], sun: "#f2c66d", far: "#fa6b4a", mid: "#2a6f8f", near: "#164f68" },
] as const;

/** FNV-1a: tiny, stable string hash. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Coordinates are rounded to one decimal: Math.sin can differ in the last bits between the
 * server's and the browser's JS engine, which would otherwise cause hydration mismatches.
 */
function hillPath(seed: number, baseline: number, amplitude: number): string {
  const phase = (seed % 100) / 100;
  const points = [0, 1, 2, 3, 4].map((i) => {
    const x = (i / 4) * 400;
    const y = Math.round((baseline - Math.sin((i + phase * 3) * 1.45) * amplitude) * 10) / 10;
    return [x, y] as const;
  });
  const [first, ...rest] = points;
  const curve = rest.map(([x, y], i) => {
    const [px, py] = points[i]!;
    const cx = (px + x) / 2;
    return `C ${cx} ${py}, ${cx} ${y}, ${x} ${y}`;
  });
  return `M ${first![0]} ${first![1]} ${curve.join(" ")} L 400 260 L 0 260 Z`;
}

interface PostcardArtProps {
  seed: string;
  type: PlaceType;
  className?: string;
}

export function PostcardArt({ seed, type, className }: PostcardArtProps) {
  const hash = hashString(seed);
  const palette = PALETTES[hash % PALETTES.length]!;
  const sunX = 70 + (hash % 260);
  const gradientId = `art-sky-${hash}`;

  return (
    <svg
      viewBox="0 0 400 250"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={cn("block h-full w-full", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.sky[0]} />
          <stop offset="1" stopColor={palette.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="250" fill={`url(#${gradientId})`} />
      <circle cx={sunX} cy={74 + (hash % 30)} r="34" fill={palette.sun} opacity="0.95" />
      <path d={hillPath(hash, 150, 22)} fill={palette.far} opacity="0.85" />
      <path d={hillPath(hash >>> 3, 182, 18)} fill={palette.mid} />
      <path d={hillPath(hash >>> 6, 214, 12)} fill={palette.near} />
      <path
        d={`M-6 ${236 - (hash % 12)} C 90 200, 150 ${236 - (hash % 20)}, 230 214 S 340 188, 410 208`}
        fill="none"
        stroke="#fffdf8"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 9"
        opacity="0.9"
      />
      <text x="376" y="238" textAnchor="end" fontSize="28" opacity="0.95">
        {PLACE_TYPE_META[type].emoji}
      </text>
    </svg>
  );
}
