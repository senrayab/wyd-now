import {
  Archive,
  CalendarCog,
  CalendarRange,
  Compass,
  Database,
  Download,
  HardDrive,
  HelpCircle,
  Info,
  LifeBuoy,
  ListChecks,
  Palette,
  RotateCcw,
  ScrollText,
  Settings,
  ShieldCheck,
  Smartphone,
  Star,
  Tags,
  Vote,
  Newspaper,
  Type,
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface MenuSection {
  id: "explore" | "settings" | "data" | "support";
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  colors: [string, string];
  items: MenuItem[];
}

export const MORE_MENU: MenuSection[] = [
  {
    id: "explore",
    href: "/more/explore",
    label: "둘러보기",
    description: "카테고리별·기간별로 일정 모아 보기",
    icon: Compass,
    colors: ["#ff6f9f", "#ffe1ec"],
    items: [
      { href: "/more/categories", label: "카테고리 가이드", description: "카테고리 뜻과 색, 카테고리별 일정", icon: Tags },
      { href: "/news", label: "기사 모음", description: "직접 골라 등록해 둔 기사", icon: Newspaper },
      { href: "/votes", label: "투표 사이트 모음", description: "음악방송·시상식·투표 앱 바로가기", icon: Vote },
      { href: "/calendar?view=list", label: "다가오는 일정 전체", description: "오늘 이후 일정을 날짜순으로", icon: ListChecks },
      { href: "/calendar?view=list&range=past", label: "지난 일정 아카이브", description: "이미 끝난 일정 다시 보기", icon: Archive },
      { href: "/calendar/day", label: "오늘 타임라인", description: "시간대별로 오늘 일정 보기", icon: CalendarRange },
    ],
  },
  {
    id: "settings",
    href: "/more/settings",
    label: "설정",
    description: "테마, 글꼴, 캘린더 표시 방식",
    icon: Settings,
    colors: ["#8b7cf6", "#ebe8ff"],
    items: [
      { href: "/more/settings/artist", label: "내 아티스트", description: "한 아티스트 전용으로 쓰기", icon: Star },
      { href: "/more/settings/theme", label: "화면 테마", description: "라이트 · 다크 · 시스템 설정", icon: Palette },
      { href: "/more/settings/font", label: "글꼴", description: "한글·영문 글꼴 선택", icon: Type },
      { href: "/more/settings/calendar", label: "캘린더", description: "주 시작 요일, 시간 표시, 기본 보기", icon: CalendarCog },
    ],
  },
  {
    id: "data",
    href: "/more/data",
    label: "데이터",
    description: "백업, 저장 공간, 초기화",
    icon: Database,
    colors: ["#4aa8ec", "#dcefff"],
    items: [
      { href: "/more/data/backup", label: "백업 · 복원", description: "모든 정보를 파일로 내보내고 불러오기", icon: Download },
      { href: "/more/data/storage", label: "저장 공간", description: "사용량 확인과 영구 저장 요청", icon: HardDrive },
      { href: "/more/data/reset", label: "샘플 · 초기화", description: "샘플 데이터 불러오기, 전체 삭제", icon: RotateCcw },
    ],
  },
  {
    id: "support",
    href: "/more/support",
    label: "지원",
    description: "도움말, 앱 설치, 앱 정보",
    icon: LifeBuoy,
    colors: ["#5fbf6a", "#e0f4df"],
    items: [
      { href: "/more/support/help", label: "도움말", description: "자주 묻는 질문", icon: HelpCircle },
      { href: "/more/support/install", label: "앱 설치 · 오프라인", description: "홈 화면에 추가하고 인터넷 없이 쓰기", icon: Smartphone },
      { href: "/more/support/privacy", label: "개인정보 안내", description: "정보가 어디에 저장되는지", icon: ShieldCheck },
      { href: "/more/support/licenses", label: "오픈소스 라이선스", description: "사용한 글꼴·아이콘·라이브러리", icon: ScrollText },
      { href: "/more/support/about", label: "앱 정보", description: "버전과 만든 목적", icon: Info },
    ],
  },
];

export function getSection(id: MenuSection["id"]) {
  return MORE_MENU.find((s) => s.id === id)!;
}
