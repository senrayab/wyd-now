/*
 * 공통 데이터 모델
 * 화면·서비스는 이 타입만 알고, 실제 저장 방식(IndexedDB / 추후 서버)은 모릅니다.
 */

export type CategoryId =
  | "concert"
  | "broadcast"
  | "radio"
  | "variety"
  | "fansign"
  | "content"
  | "release"
  | "etc";

export interface LinkItem {
  label: string;
  url: string;
}

/** 이미지가 어느 데이터에 속하는지. 삭제 시 함께 정리하는 기준이 됩니다. */
export type ImageOwner =
  | { kind: "schedule"; id: string }
  | { kind: "artist"; id: string }
  | { kind: "my-photo"; id: string } // id = artistId
  | { kind: "news"; id: string };

export interface StoredImage {
  id: string;
  /** 항상 image/webp */
  blob: Blob;
  mimeType: "image/webp";
  /** 확장자를 뺀 파일명 본문 (다운로드 시 .png 를 붙임) */
  baseName: string;
  width: number;
  height: number;
  size: number;
  owner: ImageOwner;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
}

export type ArtistType = "group" | "solo";

export interface Artist {
  id: string;
  name: string;
  type: ArtistType;
  agency?: string;
  /** YYYY-MM-DD */
  debutDate?: string;
  fandom?: string;
  members: Member[];
  links: LinkItem[];
  /** palette key (lib/palette.ts) */
  color: string;
  imageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  title: string;
  category: CategoryId;
  artistIds: string[];
  allDay: boolean;
  /** 로컬 시각 YYYY-MM-DDTHH:mm (allDay 면 시간은 00:00) */
  startAt: string;
  endAt: string;
  place?: string;
  /** 공식 링크 */
  url?: string;
  links: LinkItem[];
  /** 공개 안내 사항 (개인 메모 아님) */
  description?: string;
  imageId?: string;
  createdAt: string;
  updatedAt: string;
}

export type VoteType = "musicshow" | "award" | "app" | "etc";

/** 투표할 수 있는 사이트. 기간이 없으면 상시 투표처 */
export interface VoteSite {
  id: string;
  name: string;
  url: string;
  type: VoteType;
  /** 투표 방법·대상 같은 공개 안내 */
  description?: string;
  artistIds: string[];
  /** YYYY-MM-DD, 선택 */
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

/** 아티스트 관련 기사 (공용 정보) */
export interface NewsItem {
  id: string;
  title: string;
  url: string;
  /** 언론사 · 매체 */
  source?: string;
  /** YYYY-MM-DD */
  publishedAt: string;
  summary?: string;
  artistIds: string[];
  imageId?: string;
  createdAt: string;
  updatedAt: string;
}

/** 내가 스크랩한 기사 (이 기기에만 저장하는 개인 기록) */
export interface MyScrap {
  newsId: string;
  savedAt: string;
}

/** 아티스트 페이지의 작은 개인 공간. 공개 정보와 분리해서 보관합니다. */
export interface MySpace {
  artistId: string;
  followed: boolean;
  biasMemberId?: string;
  photoIds: string[];
  updatedAt: string;
}

type Generated = "id" | "createdAt" | "updatedAt";
export type ArtistInput = Omit<Artist, Generated>;
export type ScheduleInput = Omit<Schedule, Generated>;
export type VoteInput = Omit<VoteSite, Generated>;
export type NewsInput = Omit<NewsItem, Generated>;
export type NewImage = Omit<StoredImage, "id" | "createdAt">;

export interface BackupFile {
  app: "wyd-now";
  version: 1;
  exportedAt: string;
  artists: Artist[];
  schedules: Schedule[];
  mySpaces: MySpace[];
  /** 투표 메뉴 추가 이전 백업에는 없음 */
  votes?: VoteSite[];
  /** 소식 메뉴 추가 이전 백업에는 없음 */
  news?: NewsItem[];
  scraps?: MyScrap[];
  images: (Omit<StoredImage, "blob"> & { dataUrl: string })[];
}
