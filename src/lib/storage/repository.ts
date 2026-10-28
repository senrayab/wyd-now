/*
 * 저장소 인터페이스 (Repository 패턴)
 * 지금은 IndexedDB 구현체(indexeddb.ts)를 쓰고, 서버 DB 를 붙일 때는
 * 같은 인터페이스를 구현한 api 구현체를 추가해 getDataStore() 에서 교체합니다.
 */
import type {
  Artist,
  ArtistInput,
  BackupFile,
  ImageOwner,
  MyScrap,
  MySpace,
  NewImage,
  Schedule,
  ScheduleInput,
  StoredImage,
  NewsInput,
  NewsItem,
  Release,
  ReleaseInput,
  VoteInput,
  VoteSite,
} from "./types";

export interface CrudRepository<T, Input> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(input: Input): Promise<T>;
  update(id: string, patch: Partial<Input>): Promise<T>;
  remove(id: string): Promise<void>;
}

export interface ScheduleRepository extends CrudRepository<Schedule, ScheduleInput> {
  /** from ≤ 일정 ≤ to 와 겹치는 일정 (YYYY-MM-DD, 양 끝 포함) */
  listInRange(from: string, to: string): Promise<Schedule[]>;
  listByArtist(artistId: string): Promise<Schedule[]>;
}

export type ArtistRepository = CrudRepository<Artist, ArtistInput>;

export type VoteRepository = CrudRepository<VoteSite, VoteInput>;

export type NewsRepository = CrudRepository<NewsItem, NewsInput>;

export interface ReleaseRepository extends CrudRepository<Release, ReleaseInput> {
  /** 발매일 최신순 */
  listByArtist(artistId: string): Promise<Release[]>;
}

export interface ImageRepository {
  save(image: NewImage): Promise<StoredImage>;
  get(id: string): Promise<StoredImage | undefined>;
  remove(id: string): Promise<void>;
  listByOwner(owner: ImageOwner): Promise<StoredImage[]>;
}

export interface MySpaceRepository {
  get(artistId: string): Promise<MySpace>;
  list(): Promise<MySpace[]>;
  save(space: Omit<MySpace, "updatedAt">): Promise<MySpace>;
  remove(artistId: string): Promise<void>;
}

export interface ScrapRepository {
  list(): Promise<MyScrap[]>;
  add(newsId: string): Promise<void>;
  remove(newsId: string): Promise<void>;
}

export interface DataStore {
  schedules: ScheduleRepository;
  artists: ArtistRepository;
  votes: VoteRepository;
  news: NewsRepository;
  images: ImageRepository;
  mySpaces: MySpaceRepository;
  scraps: ScrapRepository;
  releases: ReleaseRepository;
  exportAll(): Promise<BackupFile>;
  /** 기존 데이터를 지우고 백업으로 교체 */
  importAll(backup: BackupFile): Promise<void>;
  clearAll(): Promise<void>;
}
