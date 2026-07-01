// 全画面コンパス。アイコン(42_compass.svg)と同じ手描き言語で描く。
// 針は目的地方向を指す（自分が向いている方向を「上」とした相対表示）。

import { useDampedAngle } from '../lib/useDampedAngle';

const INK = '#181311';
const ACCENT = '#9F3327';
const MUTED = '#8A817C';

// アイコン由来の二重有機リング（evenodd）
const RING_PATH =
  'M 777.22,512.00 C 775.82,555.77 756.60,601.31 735.24,640.89 C 713.89,680.46 686.30,727.48 649.09,749.45 C 611.88,771.41 556.16,775.34 512.00,772.68 C 467.84,770.01 423.76,754.04 384.14,733.46 C 344.52,712.89 303.54,686.16 274.29,649.24 C 245.03,612.33 211.82,559.61 208.59,512.00 C 205.37,464.39 228.94,406.15 254.94,363.59 C 280.94,321.03 321.73,275.99 364.58,256.65 C 407.42,237.32 463.92,245.73 512.00,247.57 C 560.08,249.42 614.42,245.95 653.03,267.73 C 691.64,289.51 722.96,337.54 743.66,378.25 C 764.36,418.96 778.62,468.23 777.22,512.00 Z M 769.61,512.00 C 771.35,553.11 753.38,603.00 730.85,638.35 C 708.32,673.70 670.93,709.02 634.46,724.10 C 597.98,739.18 550.96,732.06 512.00,728.83 C 473.04,725.61 435.92,720.57 400.71,704.75 C 365.51,688.94 323.74,666.08 300.77,633.95 C 277.81,601.83 257.32,549.42 262.92,512.00 C 268.52,474.58 310.66,440.26 334.39,409.45 C 358.11,378.65 375.68,352.40 405.28,327.15 C 434.88,301.91 476.65,257.59 512.00,257.98 C 547.35,258.37 582.63,307.21 617.37,329.50 C 652.10,351.78 695.03,361.26 720.41,391.68 C 745.78,422.09 767.87,470.89 769.61,512.00 Z';

// 北針（指す側）: アイコンの上向き菱形を少し伸ばした手描き菱形
const NEEDLE_NORTH =
  'M 512,300 C 528,300 560,470 560,512 C 560,545 532,556 512,556 C 492,556 464,545 464,512 C 464,470 496,300 512,300 Z';
const NEEDLE_SOUTH =
  'M 512,700 C 528,700 560,552 560,512 C 560,479 532,468 512,468 C 492,468 464,479 464,512 C 464,552 496,700 512,700 Z';

interface Props {
  /** 針の回転角（度, 0=正面）。null なら中立。 */
  needle: number | null;
  aligned: boolean;
  showCardinals?: boolean;
  /** 端末ヘディング（度, 表示用の方位ラベル回転）。 */
  headingForLabels?: number | null;
}

export function Compass({ needle, aligned, showCardinals, headingForLabels }: Props) {
  const angle = useDampedAngle(needle, 5.5);
  const northColor = aligned ? ACCENT : ACCENT;
  const southColor = aligned ? '#3a2b28' : INK;

  return (
    <svg
      className="compass"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="コンパス"
    >
      {/* 外周の二重有機リング */}
      <path
        d={RING_PATH}
        fill={aligned ? ACCENT : INK}
        fillRule="evenodd"
        style={{ transition: 'fill 400ms ease' }}
        opacity={aligned ? 0.92 : 1}
      />

      {/* 整列ターゲット（真上の小さな印） */}
      <circle
        cx="512"
        cy="228"
        r="9"
        fill={aligned ? ACCENT : MUTED}
        opacity={aligned ? 1 : 0.5}
        style={{ transition: 'fill 300ms ease, opacity 300ms ease' }}
      />

      {/* 方位ラベル（オプション、端末ヘディングに合わせて回転） */}
      {showCardinals && headingForLabels != null && (
        <g
          transform={`rotate(${-headingForLabels} 512 512)`}
          fill={MUTED}
          fontSize="34"
          fontFamily="-apple-system, sans-serif"
          textAnchor="middle"
          opacity="0.55"
        >
          <text x="512" y="212">
            N
          </text>
          <text x="812" y="524">
            E
          </text>
          <text x="512" y="836">
            S
          </text>
          <text x="212" y="524">
            W
          </text>
        </g>
      )}

      {/* 針（中心 512,512 で回転） */}
      <g transform={`rotate(${angle} 512 512)`}>
        <path
          d={NEEDLE_SOUTH}
          fill={southColor}
          style={{ transition: 'fill 400ms ease' }}
        />
        <path
          d={NEEDLE_NORTH}
          fill={northColor}
          style={{ transition: 'fill 400ms ease' }}
        />
        {/* 中心の留め */}
        <circle cx="512" cy="512" r="16" fill={INK} />
        <circle cx="512" cy="512" r="6" fill="#FCFBF8" />
      </g>
    </svg>
  );
}
