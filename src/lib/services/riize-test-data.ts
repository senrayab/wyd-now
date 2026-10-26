/*
 * RIIZE 샘플 데이터 (앱의 유일한 샘플).
 * 프로필(멤버·데뷔일·소속사·팬덤·생일·공식 채널)은 실제 정보이고,
 * 생일을 뺀 일정은 화면 확인용 예시라 안내 사항에 테스트임을 적어 둡니다.
 */
import { addDays, todayKey } from "../date";
import { getDataStore } from "../storage";
import type { CategoryId, LinkItem } from "../storage/types";
import { loadRiizeSampleNews, loadUrgentVoteSample } from "./riize-sample-news";
import { loadDefaultVoteSites } from "./vote-service";

const TEST_NOTE = "※ 앱 화면 확인용 테스트 일정이에요. 실제 일정과 다를 수 있어요.";
const YOUTUBE = "https://www.youtube.com/@RIIZE_official";

interface TestSchedule {
  title: string;
  category: CategoryId;
  day: number;
  endDay?: number;
  start: string;
  end: string;
  place?: string;
  url?: string;
  links?: LinkItem[];
  description?: string;
}

const SCHEDULES: TestSchedule[] = [
  { title: "RIIZE 음악방송 출연", category: "broadcast", day: 0, start: "12:00", end: "13:30", place: "KBS 신관 공개홀" },
  { title: "RIIZE FAN-CON", category: "concert", day: 0, start: "18:00", end: "20:30", place: "올림픽공원 KSPO DOME", description: "입장은 공연 1시간 전부터 시작돼요.\n티켓과 신분증을 함께 준비해 주세요." },
  { title: "공식 콘텐츠 업로드", category: "content", day: 0, start: "21:00", end: "21:30", url: YOUTUBE, description: "RIIZE 공식 유튜브 채널에서 공개돼요." },
  { title: "라디오 게스트 출연", category: "radio", day: 1, start: "20:00", end: "22:00", place: "MBC 라디오 스튜디오" },
  { title: "웹예능 게스트 출연", category: "variety", day: 3, start: "18:30", end: "19:30" },
  { title: "RIIZE 팬사인회", category: "fansign", day: 5, start: "19:00", end: "21:00", place: "서울 영등포 타임스퀘어", description: "응모 당첨자만 참여할 수 있어요." },
  { title: "RIIZE 디지털 싱글 발매", category: "release", day: 9, start: "18:00", end: "18:00", description: "각 음원 사이트에서 동시 공개돼요." },
  { title: "RIIZE 투어 · 서울", category: "concert", day: 14, endDay: 15, start: "18:00", end: "20:30", place: "고척스카이돔" },
  { title: "비하인드 영상 공개", category: "content", day: 18, start: "20:00", end: "20:20", url: YOUTUBE },
  { title: "RIIZE 음악방송 출연", category: "broadcast", day: -3, start: "15:00", end: "16:30", place: "SBS 등촌동 공개홀" },
];

/** 실제 멤버 생일 (월-일) */
const BIRTHDAYS: { name: string; md: string }[] = [
  { name: "쇼타로", md: "11-25" },
  { name: "은석", md: "03-19" },
  { name: "성찬", md: "09-13" },
  { name: "원빈", md: "03-02" },
  { name: "소희", md: "11-21" },
  { name: "앤톤", md: "03-21" },
];

/** 오늘 이후 가장 가까운 해당 월-일 */
function nextDate(md: string, today: string) {
  const year = Number(today.slice(0, 4));
  const thisYear = `${year}-${md}`;
  return thisYear >= today ? thisYear : `${year + 1}-${md}`;
}

export async function hasRiize() {
  const artists = await getDataStore().artists.list();
  return artists.some((a) => a.name.toUpperCase() === "RIIZE");
}

export async function loadRiizeTestData() {
  const store = getDataStore();
  if (await hasRiize()) throw new Error("RIIZE 정보가 이미 있어요.");

  const riize = await store.artists.create({
    name: "RIIZE",
    type: "group",
    agency: "SM엔터테인먼트",
    debutDate: "2023-09-04",
    fandom: "BRIIZE",
    members: BIRTHDAYS.map((b) => ({ id: crypto.randomUUID(), name: b.name })),
    links: [
      { label: "YouTube", url: YOUTUBE },
      { label: "Instagram", url: "https://www.instagram.com/riize_official/" },
      { label: "X", url: "https://x.com/RIIZE_official" },
      { label: "SM 공식", url: "https://www.smentertainment.com/artist/riize/" },
    ],
    color: "tangerine",
  });

  const today = todayKey();
  for (const s of SCHEDULES) {
    await store.schedules.create({
      title: s.title,
      category: s.category,
      artistIds: [riize.id],
      allDay: false,
      startAt: `${addDays(today, s.day)}T${s.start}`,
      endAt: `${addDays(today, s.endDay ?? s.day)}T${s.end}`,
      place: s.place,
      url: s.url,
      links: s.links ?? [],
      description: [s.description, TEST_NOTE].filter(Boolean).join("\n\n"),
    });
  }

  for (const b of BIRTHDAYS) {
    const date = nextDate(b.md, today);
    await store.schedules.create({
      title: `${b.name} 생일`,
      category: "etc",
      artistIds: [riize.id],
      allDay: true,
      startAt: `${date}T00:00`,
      endAt: `${date}T00:00`,
      links: [],
    });
  }

  await store.mySpaces.save({ artistId: riize.id, followed: true, photoIds: [] });
  await loadDefaultVoteSites();
  await loadRiizeSampleNews(riize.id);
  await loadUrgentVoteSample(riize.id);
  return riize;
}
