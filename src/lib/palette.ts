/** 아티스트 대표색 — 미니멀 톤의 단색 (프로필 원 배경) */
export const ARTIST_COLORS: { id: string; label: string; colors: [string, string] }[] = [
  { id: "rose", label: "더스티 로즈", colors: ["#c48b9f", "#f3e7eb"] },
  { id: "tangerine", label: "더스티 오렌지", colors: ["#d1936a", "#f6ebe3"] },
  { id: "lemon", label: "샌드", colors: ["#c8ad6a", "#f4efe1"] },
  { id: "lime", label: "세이지", colors: ["#8aa886", "#e9f0e8"] },
  { id: "mint", label: "더스티 민트", colors: ["#7fb0a6", "#e6f1ee"] },
  { id: "sky", label: "더스티 블루", colors: ["#7d95b0", "#e6ebf1"] },
  { id: "lilac", label: "더스티 라일락", colors: ["#968fc0", "#ecebf5"] },
  { id: "stone", label: "스톤", colors: ["#9a9a9a", "#eeeeee"] },
];

export function getArtistColors(id: string): [string, string] {
  return (ARTIST_COLORS.find((c) => c.id === id) ?? ARTIST_COLORS[0]).colors;
}

/** 라이트·다크 모두에서 자연스러운 옅은 배경 (포인트 색을 투명하게 섞음) */
export function tint(color: string, percent = 16) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
