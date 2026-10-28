/*
 * RIIZE 디스코그래피 샘플 (한국 발매, 2026-10-28 기준)
 * - 발매일·수록곡: 위키백과·나무위키·벅스 앨범 페이지 중 두 곳 이상에서 확인
 * - 뮤직비디오: 유튜브에서 SMTOWN 채널의 공식 MV 인지 영상 제목까지 확인한 것만 (없으면 비움)
 * - 듣기 링크: 벅스 앨범 페이지가 실제로 열리고 앨범명이 맞는지 확인
 * 커버 이미지는 저작권 때문에 넣지 않습니다. 필요하면 앨범 수정에서 직접 넣을 수 있어요.
 */
import { getDataStore } from "../storage";
import type { ReleaseInput, ReleaseKind, Track } from "../storage/types";

type SampleRelease = [title: string, kind: ReleaseKind, date: string, tracks: (string | [string, "title"])[], mv?: string, bugs?: number];

const yt = (id: string) => `https://www.youtube.com/watch?v=${id}`;

const RELEASES: SampleRelease[] = [
  ["Insomnia", "digital", "2026-10-26", [["Insomnia", "title"]], yt("RgkoXU4BlOE"), 4157112],
  ["II", "mini", "2026-06-15", ["SOAR", ["Do your dance", "title"], "D-D-Done", "Overdrive", "Like a Bomb", "In a Loop"], yt("HDGCTtuW-Yo"), 4149702],
  ["21세기 대군부인 OST Part.4", "ost", "2026-04-18", [["Behind The Shine", "title"], "Behind The Shine (Inst.)"], undefined, 4145700],
  ["Fame", "single", "2025-11-24", ["Something's in the Water", ["Fame", "title"], "Sticky Like"], yt("TVqEwvbZP30"), 4134139],
  [
    "ODYSSEY",
    "album",
    "2025-05-19",
    ["Odyssey", "Bag Bad Back", "잉걸 (Ember to Solar)", ["Fly Up", "title"], "Show Me Love", "Passage", "Midnight Mirage", "모든 하루의 끝 (The End of the Day)", "Inside My Love", "Another Life"],
    yt("vLUtHODdLzk"),
    4118686,
  ],
  ["Hug (포옹)", "etc", "2025-01-08", [["Hug (포옹)", "title"]], undefined, 4112607],
  ["RIIZING : Epilogue", "mini", "2024-09-04", ["Combo", ["Boom Boom Bass", "title"], "Siren", "Impossible", "9 Days", "Honestly", "One Kiss", "Talk Saxy", "Love 119"], undefined, 4106635],
  ["RIIZING", "mini", "2024-06-17", [["Boom Boom Bass", "title"], "Siren", "Impossible", "9 Days", "Honestly", "One Kiss", "Talk Saxy", "Love 119"], yt("78lNnCitcBM"), 4099766],
  ["Impossible", "digital", "2024-04-18", [["Impossible", "title"]], yt("Ey53EQhkLY8")],
  ["Siren", "digital", "2024-04-03", [["Siren", "title"]]],
  ["Love 119", "digital", "2024-01-05", [["Love 119", "title"]], yt("0TAAUWHo4Ec"), 4094833],
  ["씰룩(SEALOOK) OST", "ost", "2023-11-04", [["HAPPY! HAPPY! HAPPY!", "title"], ["Look at me SEALOOK", "title"]], undefined, 4092726],
  ["Talk Saxy", "digital", "2023-10-27", [["Talk Saxy", "title"]], yt("gJMheHHf4GQ"), 4092445],
  ["Get A Guitar", "single", "2023-09-04", [["Get A Guitar", "title"], "Memories"], yt("iUw3LPM7OBU"), 4090366],
  ["Memories", "digital", "2023-08-21", [["Memories", "title"]], yt("2H0duKgnYgE")],
];

function toInput(artistId: string, [title, kind, releaseDate, tracks, mv, bugs]: SampleRelease): ReleaseInput {
  return {
    artistId,
    title,
    kind,
    releaseDate,
    tracks: tracks.map((t): Track => (Array.isArray(t) ? { title: t[0], isTitle: true } : { title: t })),
    mvUrl: mv,
    links: bugs ? [{ label: "벅스", url: `https://music.bugs.co.kr/album/${bugs}` }] : [],
  };
}

/**
 * 처음 넣은 샘플에서 RIIZING : Epilogue 타이틀곡을 Combo 로 잘못 표시했던 것 바로잡기.
 * 샘플 그대로(Combo 만 타이틀)인 경우만 고치고, 사용자가 직접 바꾼 내용은 건드리지 않음
 */
export async function fixEpilogueTitle() {
  const { releases } = getDataStore();
  const target = (await releases.list()).find((r) => r.title === "RIIZING : Epilogue");
  if (!target) return;
  const titles = target.tracks.filter((t) => t.isTitle).map((t) => t.title);
  if (titles.length !== 1 || titles[0] !== "Combo") return;
  await releases.update(target.id, { tracks: target.tracks.map((t) => ({ title: t.title, isTitle: t.title === "Boom Boom Bass" || undefined })) });
}

/** 시작할 때 한 번만 넣었는지 표시 (사용자가 지운 앨범이 다시 생기지 않게) */
export const RELEASES_SAMPLE_KEY = "wyd:sample-releases";

/** 이미 같은 이름의 앨범이 있으면 건너뜀. 추가한 개수를 돌려줌 */
export async function loadRiizeReleases(artistId: string) {
  const { releases } = getDataStore();
  const existing = new Set((await releases.listByArtist(artistId)).map((r) => r.title));
  let added = 0;
  for (const sample of RELEASES) {
    if (existing.has(sample[0])) continue;
    await releases.create(toInput(artistId, sample));
    added += 1;
  }
  try {
    localStorage.setItem(RELEASES_SAMPLE_KEY, "1");
  } catch {
    // 저장이 막힌 환경: 다음에 다시 넣으려 해도 같은 이름은 건너뜀
  }
  return added;
}
