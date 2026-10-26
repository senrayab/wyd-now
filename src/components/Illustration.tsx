import type { CategoryId } from "@/lib/storage/types";

/*
 * 카테고리별 일러스트 — 미니멀 '하얀 오브제' 스타일.
 * 흰 물체(은은한 그라데이션) + 검정 디테일 + 아래 부드러운 그림자, 포인트 색은 한 군데만.
 * 같은 정의를 쓰므로 여러 개가 한 화면에 있어도 id 가 겹쳐도 결과가 같습니다.
 */
const INK = "#1c1c1c";
const ACCENT = "#7d95b0";
/* 바탕 위에 바로 그려지는 선·도형은 다크 모드에서 밝게 (globals.css 의 --illo-line / --illo-solid) */
const LINE = { stroke: "var(--illo-line)" };
const LINE_FILL = { fill: "var(--illo-line)" };
const SOLID = { fill: "var(--illo-solid)" };

function Defs() {
  return (
    <defs>
      <radialGradient id="wyd-obj" cx="35%" cy="28%" r="80%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.65" stopColor="#f1f1f1" />
        <stop offset="1" stopColor="#d6d6d6" />
      </radialGradient>
      <linearGradient id="wyd-side" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#dedede" />
      </linearGradient>
      <filter id="wyd-blur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" />
      </filter>
    </defs>
  );
}

const shadow = (cx: number, w: number) => <ellipse cx={cx} cy="88" rx={w} ry="4.5" fill="#000" opacity="0.16" filter="url(#wyd-blur)" />;

const SHAPES: Record<CategoryId, React.ReactNode> = {
  concert: (
    <>
      {shadow(60, 22)}
      <rect x="55" y="44" width="10" height="42" rx="5" fill="url(#wyd-side)" />
      <circle cx="60" cy="32" r="18" fill="url(#wyd-obj)" />
      <path d="M46 30 h28 M47 36 h26" stroke={INK} strokeWidth="1.2" opacity="0.25" />
      <rect x="53" y="47" width="14" height="5" rx="2.5" fill={INK} />
      <circle cx="88" cy="20" r="3" fill={ACCENT} />
    </>
  ),
  broadcast: (
    <>
      {shadow(60, 34)}
      <path d="M48 26 L38 10 M72 26 L82 10" style={LINE} strokeWidth="2.2" strokeLinecap="round" />
      <rect x="22" y="26" width="76" height="56" rx="14" fill="url(#wyd-side)" />
      <rect x="31" y="35" width="50" height="38" rx="8" fill={INK} />
      <circle cx="89" cy="44" r="3" fill={ACCENT} />
      <circle cx="89" cy="56" r="2.5" fill={INK} opacity="0.3" />
    </>
  ),
  radio: (
    <>
      {shadow(60, 36)}
      <rect x="20" y="34" width="80" height="48" rx="16" fill="url(#wyd-side)" />
      <circle cx="44" cy="58" r="14" fill={INK} />
      <circle cx="44" cy="58" r="5" fill="#3a3a3a" />
      <rect x="66" y="48" width="24" height="4" rx="2" fill={INK} opacity="0.25" />
      <rect x="66" y="58" width="16" height="4" rx="2" fill={INK} opacity="0.25" />
      <circle cx="86" cy="70" r="3.5" fill={ACCENT} />
      <path d="M34 34 L78 18" style={LINE} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  variety: (
    <>
      {shadow(60, 26)}
      <circle cx="60" cy="50" r="32" fill="url(#wyd-obj)" />
      <circle cx="50" cy="44" r="3" fill={INK} />
      <circle cx="70" cy="44" r="3" fill={INK} />
      <path d="M48 58 Q60 68 72 58" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="96" cy="22" r="3" fill={ACCENT} />
    </>
  ),
  fansign: (
    <>
      {shadow(58, 34)}
      <rect x="22" y="28" width="62" height="50" rx="10" fill="url(#wyd-side)" transform="rotate(-8 53 53)" />
      <path d="M34 60 Q44 46 52 58 T72 52" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <rect x="80" y="14" width="8" height="58" rx="4" style={LINE_FILL} transform="rotate(32 84 43)" />
      <path d="M96 64 l-6 6" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  content: (
    <>
      {shadow(60, 32)}
      <rect x="26" y="22" width="68" height="62" rx="20" fill="url(#wyd-side)" />
      <path d="M52 40 L72 53 L52 66 Z" fill={INK} />
      <circle cx="84" cy="32" r="3" fill={ACCENT} />
    </>
  ),
  release: (
    <>
      {shadow(60, 30)}
      <circle cx="60" cy="50" r="34" style={SOLID} />
      <circle cx="60" cy="50" r="25" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.18" />
      <circle cx="60" cy="50" r="18" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.18" />
      <circle cx="60" cy="50" r="11" fill="url(#wyd-obj)" />
      <circle cx="60" cy="50" r="2.5" fill={ACCENT} />
    </>
  ),
  etc: (
    <>
      {shadow(58, 24)}
      <path d="M58 16 C60 40 64 44 88 48 C64 52 60 56 58 82 C56 56 52 52 28 48 C52 44 56 40 58 16 Z" fill="url(#wyd-obj)" />
      <path d="M92 18 C93 25 94 26 100 27 C94 28 93 29 92 36 C91 29 90 28 84 27 C90 26 91 25 92 18 Z" style={LINE_FILL} />
      <circle cx="30" cy="22" r="3" fill={ACCENT} />
    </>
  ),
};

export default function Illustration({ category, className }: { category: CategoryId; className?: string }) {
  return (
    <svg viewBox="0 0 120 96" className={className} aria-hidden>
      <Defs />
      {SHAPES[category] ?? SHAPES.etc}
    </svg>
  );
}
