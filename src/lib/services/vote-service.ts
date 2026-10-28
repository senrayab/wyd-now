import { Smartphone, Trophy, Tv, Vote, type LucideIcon } from "lucide-react";
import { getDataStore } from "../storage";
import type { VoteInput, VoteSite, VoteType } from "../storage/types";
import { applyImageChange, type ImageChange } from "./image-attach";
import { isValidUrl } from "./schedule-service";

export interface VoteTypeMeta {
  id: VoteType;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export const VOTE_TYPES: VoteTypeMeta[] = [
  { id: "musicshow", label: "음악방송", description: "음악방송 사전·생방송 투표", icon: Tv, color: "#c49a72" },
  { id: "award", label: "시상식", description: "연말·연초 시상식 인기상 투표", icon: Trophy, color: "#b8a66e" },
  { id: "app", label: "투표 앱", description: "아이돌 순위·응원 투표 앱", icon: Smartphone, color: "#7d95b0" },
  { id: "etc", label: "기타", description: "그 밖의 투표", icon: Vote, color: "#968fc0" },
];

export function getVoteType(id: VoteType) {
  return VOTE_TYPES.find((t) => t.id === id) ?? VOTE_TYPES[VOTE_TYPES.length - 1];
}

export function isVoteType(value: string | null): value is VoteType {
  return VOTE_TYPES.some((t) => t.id === value);
}

export type VoteStatus =
  | { kind: "always"; label: "상시" }
  | { kind: "upcoming"; label: string }
  | { kind: "open"; label: string }
  | { kind: "closed"; label: "마감" };

/** 목록 탭: 진행 중(상시 포함) · 예정 · 지난 투표 */
export type VoteTab = "live" | "upcoming" | "closed";

type Period = Pick<VoteSite, "startDate" | "endDate" | "startTime" | "endTime">;

/** 지금 한국 시간 (YYYY-MM-DDTHH:mm) — 기기 시간대와 관계없이 투표 상태는 한국 시간 기준 */
export function nowSeoul(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const startStamp = (v: Period) => (v.startDate ? `${v.startDate}T${v.startTime || "00:00"}` : undefined);
const endStamp = (v: Period) => (v.endDate ? `${v.endDate}T${v.endTime || "23:59"}` : undefined);

/** 날짜 차이 → D-day 라벨 (한국 날짜 기준) */
function dDayFrom(key: string, today: string) {
  const diff = Math.round((Date.parse(key) - Date.parse(today)) / 86400000);
  if (diff === 0) return "D-DAY";
  return diff > 0 ? `D-${diff}` : `D+${-diff}`;
}

/** 기간(날짜 + 시각)으로 상태 계산. 기간이 없으면 상시 */
export function voteStatus(vote: Period, now = nowSeoul()): VoteStatus {
  const start = startStamp(vote);
  const end = endStamp(vote);
  if (!start && !end) return { kind: "always", label: "상시" };
  const today = now.slice(0, 10);
  if (end && end < now) return { kind: "closed", label: "마감" };
  if (start && start > now) return { kind: "upcoming", label: `${dDayFrom(vote.startDate!, today)} 시작` };
  return { kind: "open", label: vote.endDate ? `마감 ${dDayFrom(vote.endDate, today)}` : "진행 중" };
}

export function voteTab(vote: Period, now = nowSeoul()): VoteTab {
  const kind = voteStatus(vote, now).kind;
  return kind === "upcoming" ? "upcoming" : kind === "closed" ? "closed" : "live";
}

/** 마감 2일 이내면 강조 */
export function isUrgent(vote: Period, now = nowSeoul()) {
  if (voteStatus(vote, now).kind !== "open" || !vote.endDate) return false;
  return (Date.parse(vote.endDate) - Date.parse(now.slice(0, 10))) / 86400000 <= 2;
}

/**
 * 탭별 정렬
 * - 진행 중: 마감이 가까운 순, 상시는 기간 있는 투표 뒤에 이름순
 * - 예정: 시작이 가까운 순
 * - 지난 투표: 최근에 마감한 순
 */
export function groupVotes(list: VoteSite[], now = nowSeoul()) {
  const byName = (a: VoteSite, b: VoteSite) => a.name.localeCompare(b.name, "ko");
  const of = (kind: VoteStatus["kind"]) => list.filter((v) => voteStatus(v, now).kind === kind);
  return {
    open: of("open").sort((a, b) => (endStamp(a) ?? "9999").localeCompare(endStamp(b) ?? "9999") || byName(a, b)),
    always: of("always").sort(byName),
    upcoming: of("upcoming").sort((a, b) => startStamp(a)!.localeCompare(startStamp(b)!) || byName(a, b)),
    closed: of("closed").sort((a, b) => endStamp(b)!.localeCompare(endStamp(a)!) || byName(a, b)),
  };
}

/** 진행 중 → 예정 → 상시 → 마감 순 (홈·아티스트 페이지) */
export function sortVotes(list: VoteSite[], now = nowSeoul()) {
  const g = groupVotes(list, now);
  return [...g.open, ...g.upcoming, ...g.always, ...g.closed];
}

/** 사이트 이름: 예전에 입력한 값, 없으면 자주 쓰는 사이트 이름이나 주소 도메인 (등록 화면에서는 따로 받지 않음) */
export function siteName(vote: Pick<VoteSite, "site" | "url">) {
  if (vote.site) return vote.site;
  const known = DEFAULT_SITES.find((d) => d.url === vote.url);
  if (known) return known.site!;
  try {
    return new URL(vote.url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** 기간 짧게: "10.28 14:00 – 11.3" (시각을 따로 정하지 않았으면 날짜만) */
export function periodLabel(vote: Period, long = false) {
  if (!vote.startDate && !vote.endDate) return "";
  const one = (date?: string, time?: string, fallback?: string) => {
    if (!date) return "";
    const [, m, d] = date.split("-").map(Number);
    const day = long ? `${date.slice(0, 4)}.${m}.${d}` : `${m}.${d}`;
    return time && time !== fallback ? `${day} ${time}` : day;
  };
  return `${one(vote.startDate, vote.startTime, "00:00")} ~ ${one(vote.endDate, vote.endTime, "23:59")}`.trim();
}

/** 썸네일 위 짧은 배지: 진행 중은 마감까지, 예정은 시작까지 D-day */
export function badgeLabel(vote: Period, now = nowSeoul()) {
  const status = voteStatus(vote, now);
  const today = now.slice(0, 10);
  if (status.kind === "open") return vote.endDate ? dDayFrom(vote.endDate, today) : "진행 중";
  if (status.kind === "upcoming") return dDayFrom(vote.startDate!, today);
  return status.label;
}

/** 카드 날짜 줄: 진행 중 "~ 마감", 예정 "시작 ~", 지난 투표 "시작 ~ 마감" (시각 포함) */
export function cardPeriod(vote: Period, now = nowSeoul()) {
  const at = (date?: string, time?: string, fallback = "00:00") => (date ? `${date.replaceAll("-", ".")} ${time || fallback}` : "");
  const start = at(vote.startDate, vote.startTime);
  const end = at(vote.endDate, vote.endTime, "23:59");
  const kind = voteStatus(vote, now).kind;
  if (kind === "always") return "";
  if (kind === "open") return end ? `~ ${end}` : `${start} ~`;
  if (kind === "upcoming") return `${start} ~`;
  return [start, end].filter(Boolean).join(" ~ ");
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type VoteErrors = Partial<Record<"name" | "url" | "startDate" | "endDate", string>>;

export function validateVote(values: VoteInput, hasPeriod: boolean) {
  const errors: VoteErrors = {};
  if (!values.name.trim()) errors.name = "투표 제목을 입력해 주세요.";
  // 주소는 나중에 채워도 됨. 적었다면 올바른 형식이어야 함
  if (values.url.trim() && !isValidUrl(values.url)) errors.url = "http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.";
  if (hasPeriod) {
    if (!values.startDate || (values.startTime && !TIME_RE.test(values.startTime))) errors.startDate = "시작 날짜와 시각을 확인해 주세요.";
    if (!values.endDate || (values.endTime && !TIME_RE.test(values.endTime))) errors.endDate = "마감 날짜와 시각을 확인해 주세요.";
    const start = startStamp(values);
    const end = endStamp(values);
    if (!errors.startDate && !errors.endDate && start && end && end < start) errors.endDate = "마감이 시작보다 빨라요.";
  }
  return errors;
}

export async function saveVote(values: VoteInput, image: ImageChange, existing?: VoteSite) {
  const { votes } = getDataStore();
  const clean: VoteInput = {
    ...values,
    name: values.name.trim(),
    site: values.site?.trim() || undefined,
    url: values.url.trim(),
    target: values.target?.trim() || undefined,
    description: values.description?.trim() || undefined,
    startDate: values.startDate || undefined,
    endDate: values.endDate || undefined,
    startTime: values.startDate ? values.startTime || undefined : undefined,
    endTime: values.endDate ? values.endTime || undefined : undefined,
  };
  if (existing) {
    const imageId = await applyImageChange(image, existing.imageId, { kind: "vote", id: existing.id });
    return votes.update(existing.id, { ...clean, imageId });
  }
  const created = await votes.create({ ...clean, imageId: undefined });
  if (image.kind !== "replace") return created;
  const imageId = await applyImageChange(image, undefined, { kind: "vote", id: created.id });
  return votes.update(created.id, { imageId });
}

/** 복사: 같은 내용으로 새 투표를 만듦 (대표 이미지는 지울 때 서로 영향이 없도록 복사하지 않음) */
export async function copyVote(vote: VoteSite) {
  const { votes } = getDataStore();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 새 항목에서 다시 만들어지는 값
  const { id, createdAt, updatedAt, imageId, ...rest } = vote;
  return votes.create({ ...rest, name: `${vote.name} (복사)` });
}

export async function deleteVote(vote: VoteSite) {
  const { votes, images } = getDataStore();
  if (vote.imageId) await images.remove(vote.imageId);
  await votes.remove(vote.id);
}

/*
 * 자주 쓰는 투표 사이트. 주소를 직접 열어 실제 사이트임을 확인한 것만 넣습니다.
 */
const DEFAULT_SITES: Omit<VoteInput, "artistIds">[] = [
  { name: "Mnet Plus", site: "Mnet Plus", url: "https://www.mnetplus.world/", type: "musicshow", description: "Mnet 엠카운트다운, MAMA AWARDS 투표를 할 수 있어요." },
  { name: "아이돌챔프", site: "아이돌챔프", url: "https://www.idolchamp.co.kr/", type: "musicshow", description: "MBC M 쇼챔피언 투표와 아이돌 랭킹 투표를 할 수 있어요." },
  { name: "Mubeat", site: "Mubeat", url: "https://mubeat.tv/", type: "app", description: "아이돌 응원·투표 앱이에요." },
  { name: "최애돌", site: "최애돌", url: "https://www.myloveidol.com/", type: "app", description: "아이돌 순위 투표 앱이에요." },
];

/** 이미 같은 주소가 있으면 건너뜀. 추가한 개수를 돌려줌 */
export async function loadDefaultVoteSites() {
  const { votes } = getDataStore();
  const existing = new Set((await votes.list()).map((v) => v.url));
  let added = 0;
  for (const site of DEFAULT_SITES) {
    if (existing.has(site.url)) continue;
    await votes.create({ ...site, artistIds: [] });
    added += 1;
  }
  return added;
}
