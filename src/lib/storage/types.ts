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
  | { kind: "news"; id: string }
  | { kind: "release"; id: string }
  | { kind: "vote"; id: string };

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
  /** 아티스트 페이지 상단 배경 이미지 */
  coverImageId?: string;
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
  /** 투표 사이트 이름 (예: Mnet Plus). 이전 데이터에는 없을 수 있어 주소로 대신 표시 */
  site?: string;
  /** 투표 대상·주제 */
  target?: string;
  /** 투표 안내: 참여 방법 · 유의사항 */
  description?: string;
  imageId?: string;
  artistIds: string[];
  /** YYYY-MM-DD, 선택 (둘 다 없으면 상시) */
  startDate?: string;
  endDate?: string;
  /** HH:mm 한국 시간. 없으면 시작 00:00 · 마감 23:59 */
  startTime?: string;
  endTime?: string;
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

export type ReleaseKind = "album" | "mini" | "single" | "digital" | "ost" | "etc";

export interface Track {
  title: string;
  /** 타이틀곡 */
  isTitle?: boolean;
}

/** 아티스트의 앨범·싱글 (디스코그래피, 공용 정보) */
export interface Release {
  id: string;
  artistId: string;
  title: string;
  kind: ReleaseKind;
  /** YYYY-MM-DD */
  releaseDate: string;
  tracks: Track[];
  /** 타이틀곡 공식 뮤직비디오 */
  mvUrl?: string;
  /** 음원 사이트 등 */
  links: LinkItem[];
  /** 앨범 소개 (공개 정보) */
  description?: string;
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
  /** 최애 멤버 (최대 2명, 고른 순서대로) */
  biasMemberIds?: string[];
  /** @deprecated 한 명만 고르던 시절 값. biasIdsOf() 로 읽음 */
  biasMemberId?: string;
  photoIds: string[];
  updatedAt: string;
}

type Generated = "id" | "createdAt" | "updatedAt";
export type ArtistInput = Omit<Artist, Generated>;
export type ScheduleInput = Omit<Schedule, Generated>;
export type VoteInput = Omit<VoteSite, Generated>;
export type NewsInput = Omit<NewsItem, Generated>;
export type ReleaseInput = Omit<Release, Generated>;
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
  /** 디스코그래피 추가 이전 백업에는 없음 */
  releases?: Release[];
  images: (Omit<StoredImage, "blob"> & { dataUrl: string })[];
}
