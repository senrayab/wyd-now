import { Smartphone, Trophy, Tv, Vote, type LucideIcon } from "lucide-react";
import { dDay, todayKey } from "../date";
import { getDataStore } from "../storage";
import type { VoteInput, VoteSite, VoteType } from "../storage/types";
import { isValidUrl } from "./schedule-service";

export interface VoteTypeMeta {
  id: VoteType;
  label: string;
  description: string;
  icon: LucideIcon;
  /** 격자 카드용 토스페이스 이모지 */
  emoji: string;
  color: string;
}

export const VOTE_TYPES: VoteTypeMeta[] = [
  { id: "musicshow", label: "음악방송", description: "음악방송 사전·생방송 투표", icon: Tv, emoji: "📺", color: "#c49a72" },
  { id: "award", label: "시상식", description: "연말·연초 시상식 인기상 투표", icon: Trophy, emoji: "🏆", color: "#b8a66e" },
  { id: "app", label: "투표 앱", description: "아이돌 순위·응원 투표 앱", icon: Smartphone, emoji: "📱", color: "#7d95b0" },
  { id: "etc", label: "기타", description: "그 밖의 투표", icon: Vote, emoji: "🗳️", color: "#968fc0" },
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

/** 기간으로 상태 계산. 기간이 없으면 상시 */
export function voteStatus(vote: Pick<VoteSite, "startDate" | "endDate">, today = todayKey()): VoteStatus {
  if (!vote.startDate && !vote.endDate) return { kind: "always", label: "상시" };
  if (vote.endDate && vote.endDate < today) return { kind: "closed", label: "마감" };
  if (vote.startDate && vote.startDate > today) return { kind: "upcoming", label: `${dDay(vote.startDate)} 시작` };
  return { kind: "open", label: vote.endDate ? `마감 ${dDay(vote.endDate)}` : "진행 중" };
}

/** 마감 2일 이내면 강조 */
export function isUrgent(vote: Pick<VoteSite, "startDate" | "endDate">, today = todayKey()) {
  if (voteStatus(vote, today).kind !== "open" || !vote.endDate) return false;
  const days = (new Date(vote.endDate).getTime() - new Date(today).getTime()) / 86400000;
  return days <= 2;
}

/** 진행 중 → 예정 → 상시 → 마감 순, 같은 상태끼리는 마감 임박순 */
export function sortVotes(list: VoteSite[]) {
  const rank = { open: 0, upcoming: 1, always: 2, closed: 3 };
  return [...list].sort((a, b) => {
    const r = rank[voteStatus(a).kind] - rank[voteStatus(b).kind];
    if (r) return r;
    return (a.endDate ?? "9999").localeCompare(b.endDate ?? "9999") || a.name.localeCompare(b.name, "ko");
  });
}

export function validateVote(values: VoteInput) {
  const errors: Partial<Record<"name" | "url" | "endDate", string>> = {};
  if (!values.name.trim()) errors.name = "이름을 입력해 주세요.";
  if (!isValidUrl(values.url)) errors.url = "http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.";
  if (values.startDate && values.endDate && values.endDate < values.startDate) errors.endDate = "마감일이 시작일보다 빨라요.";
  return errors;
}

export async function saveVote(values: VoteInput, existing?: VoteSite) {
  const { votes } = getDataStore();
  const clean: VoteInput = {
    ...values,
    name: values.name.trim(),
    url: values.url.trim(),
    description: values.description?.trim() || undefined,
    startDate: values.startDate || undefined,
    endDate: values.endDate || undefined,
  };
  return existing ? votes.update(existing.id, clean) : votes.create(clean);
}

/*
 * 자주 쓰는 투표 사이트. 주소를 직접 열어 실제 사이트임을 확인한 것만 넣습니다.
 */
const DEFAULT_SITES: Omit<VoteInput, "artistIds">[] = [
  { name: "Mnet Plus", url: "https://www.mnetplus.world/", type: "musicshow", description: "Mnet 엠카운트다운, MAMA AWARDS 투표를 할 수 있어요." },
  { name: "아이돌챔프", url: "https://www.idolchamp.co.kr/", type: "musicshow", description: "MBC M 쇼챔피언 투표와 아이돌 랭킹 투표를 할 수 있어요." },
  { name: "Mubeat", url: "https://mubeat.tv/", type: "app", description: "아이돌 응원·투표 앱이에요." },
  { name: "최애돌", url: "https://www.myloveidol.com/", type: "app", description: "아이돌 순위 투표 앱이에요." },
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
