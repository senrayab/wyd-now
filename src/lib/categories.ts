import {
  Clapperboard,
  Disc3,
  Ellipsis,
  Laugh,
  MicVocal,
  PenLine,
  Radio,
  Tv,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId } from "./storage/types";

export interface Category {
  id: CategoryId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** [차분한 포인트 색, 옅은 배경색] — 미니멀 톤에 맞춰 채도를 낮춤 */
  colors: [string, string];
}

export const CATEGORIES: Category[] = [
  { id: "concert", label: "공연", description: "콘서트, 팬미팅, 투어", icon: MicVocal, colors: ["#c48b9f", "#f3e7eb"] },
  { id: "broadcast", label: "방송", description: "음악방송, 드라마, 생방송", icon: Tv, colors: ["#c49a72", "#f4ece4"] },
  { id: "radio", label: "라디오", description: "라디오 출연, 보이는 라디오", icon: Radio, colors: ["#b8a66e", "#f2eee2"] },
  { id: "variety", label: "예능", description: "예능, 웹예능, 게스트 출연", icon: Laugh, colors: ["#8aa886", "#e9f0e8"] },
  { id: "fansign", label: "팬사인", description: "팬사인회, 대면·영상통화 이벤트", icon: PenLine, colors: ["#968fc0", "#ecebf5"] },
  { id: "content", label: "콘텐츠", description: "공식 영상, 유튜브, SNS 라이브", icon: Clapperboard, colors: ["#7d95b0", "#e6ebf1"] },
  { id: "release", label: "발매", description: "앨범·음원 발매, 쇼케이스", icon: Disc3, colors: ["#b4857f", "#f2e8e6"] },
  { id: "etc", label: "기타", description: "생일, 기념일, 그 밖의 일정", icon: Ellipsis, colors: ["#9a9a9a", "#eeeeee"] },
];

const BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

export function getCategory(id: CategoryId): Category {
  return BY_ID[id] ?? BY_ID.etc;
}

export function isCategoryId(value: string | null): value is CategoryId {
  return value !== null && value in BY_ID;
}
