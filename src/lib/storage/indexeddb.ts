/*
 * IndexedDB 구현체
 * 화면 컴포넌트는 이 파일을 직접 import 하지 않고 getDataStore() 를 통해 씁니다.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { notifyChange } from "./events";
import type {
  ArtistRepository,
  DataStore,
  ImageRepository,
  MySpaceRepository,
  ScheduleRepository,
  NewsRepository,
  ReleaseRepository,
  ScrapRepository,
  VoteRepository,
} from "./repository";
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

const DB_NAME = "wyd-now";
const DB_VERSION = 5;

type ImageRow = StoredImage & { ownerKey: string };

interface WydDB extends DBSchema {
  artists: { key: string; value: Artist };
  schedules: {
    key: string;
    value: Schedule;
    indexes: { startAt: string; artistIds: string };
  };
  images: { key: string; value: ImageRow; indexes: { ownerKey: string } };
  mySpaces: { key: string; value: MySpace };
  votes: { key: string; value: VoteSite };
  news: { key: string; value: NewsItem };
  scraps: { key: string; value: MyScrap };
  releases: { key: string; value: Release; indexes: { artistId: string } };
}

const ownerKey = (owner: ImageOwner) => `${owner.kind}:${owner.id}`;
const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

function stripOwnerKey(row: ImageRow): StoredImage {
  const image: Partial<ImageRow> = { ...row };
  delete image.ownerKey;
  return image as StoredImage;
}

let dbPromise: Promise<IDBPDatabase<WydDB>> | null = null;

function db() {
  dbPromise ??= openDB<WydDB>(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore("artists", { keyPath: "id" });
        const schedules = database.createObjectStore("schedules", { keyPath: "id" });
        schedules.createIndex("startAt", "startAt");
        schedules.createIndex("artistIds", "artistIds", { multiEntry: true });
        const images = database.createObjectStore("images", { keyPath: "id" });
        images.createIndex("ownerKey", "ownerKey");
        database.createObjectStore("mySpaces", { keyPath: "artistId" });
      }
      // v2: 투표 사이트
      if (oldVersion < 2) database.createObjectStore("votes", { keyPath: "id" });
      // v3: 아티스트 소식
      if (oldVersion < 3) database.createObjectStore("news", { keyPath: "id" });
      // v4: 내 스크랩
      if (oldVersion < 4) database.createObjectStore("scraps", { keyPath: "newsId" });
      // v5: 디스코그래피
      if (oldVersion < 5) database.createObjectStore("releases", { keyPath: "id" }).createIndex("artistId", "artistId");
    },
  });
  return dbPromise;
}

function sortSchedules(list: Schedule[]) {
  return list.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.title.localeCompare(b.title));
}

const schedules: ScheduleRepository = {
  async list() {
    return sortSchedules(await (await db()).getAll("schedules"));
  },
  async get(id) {
    return (await db()).get("schedules", id);
  },
  async create(input: ScheduleInput) {
    const item: Schedule = { ...input, id: newId(), createdAt: now(), updatedAt: now() };
    await (await db()).put("schedules", item);
    notifyChange();
    return item;
  },
  async update(id, patch) {
    const database = await db();
    const current = await database.get("schedules", id);
    if (!current) throw new Error("일정을 찾을 수 없어요.");
    const item: Schedule = { ...current, ...patch, id, updatedAt: now() };
    await database.put("schedules", item);
    notifyChange();
    return item;
  },
  async remove(id) {
    await (await db()).delete("schedules", id);
    notifyChange();
  },
  async listInRange(from, to) {
    const rows = await (await db()).getAllFromIndex(
      "schedules",
      "startAt",
      IDBKeyRange.upperBound(`${to}T23:59`),
    );
    return sortSchedules(rows.filter((s) => s.endAt.slice(0, 10) >= from));
  },
  async listByArtist(artistId) {
    return sortSchedules(await (await db()).getAllFromIndex("schedules", "artistIds", artistId));
  },
};

const artists: ArtistRepository = {
  async list() {
    const rows = await (await db()).getAll("artists");
    return rows.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  },
  async get(id) {
    return (await db()).get("artists", id);
  },
  async create(input: ArtistInput) {
    const item: Artist = { ...input, id: newId(), createdAt: now(), updatedAt: now() };
    await (await db()).put("artists", item);
    notifyChange();
    return item;
  },
  async update(id, patch) {
    const database = await db();
    const current = await database.get("artists", id);
    if (!current) throw new Error("아티스트를 찾을 수 없어요.");
    const item: Artist = { ...current, ...patch, id, updatedAt: now() };
    await database.put("artists", item);
    notifyChange();
    return item;
  },
  async remove(id) {
    await (await db()).delete("artists", id);
    notifyChange();
  },
};

const votes: VoteRepository = {
  async list() {
    const rows = await (await db()).getAll("votes");
    return rows.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  },
  async get(id) {
    return (await db()).get("votes", id);
  },
  async create(input: VoteInput) {
    const item: VoteSite = { ...input, id: newId(), createdAt: now(), updatedAt: now() };
    await (await db()).put("votes", item);
    notifyChange();
    return item;
  },
  async update(id, patch) {
    const database = await db();
    const current = await database.get("votes", id);
    if (!current) throw new Error("투표 사이트를 찾을 수 없어요.");
    const item: VoteSite = { ...current, ...patch, id, updatedAt: now() };
    await database.put("votes", item);
    notifyChange();
    return item;
  },
  async remove(id) {
    await (await db()).delete("votes", id);
    notifyChange();
  },
};

const news: NewsRepository = {
  async list() {
    const rows = await (await db()).getAll("news");
    // 최신 기사부터
    return rows.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.createdAt.localeCompare(a.createdAt));
  },
  async get(id) {
    return (await db()).get("news", id);
  },
  async create(input: NewsInput) {
    const item: NewsItem = { ...input, id: newId(), createdAt: now(), updatedAt: now() };
    await (await db()).put("news", item);
    notifyChange();
    return item;
  },
  async update(id, patch) {
    const database = await db();
    const current = await database.get("news", id);
    if (!current) throw new Error("기사를 찾을 수 없어요.");
    const item: NewsItem = { ...current, ...patch, id, updatedAt: now() };
    await database.put("news", item);
    notifyChange();
    return item;
  },
  async remove(id) {
    await (await db()).delete("news", id);
    notifyChange();
  },
};

const sortReleases = (list: Release[]) =>
  list.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || b.createdAt.localeCompare(a.createdAt));

const releases: ReleaseRepository = {
  async list() {
    return sortReleases(await (await db()).getAll("releases"));
  },
  async listByArtist(artistId) {
    return sortReleases(await (await db()).getAllFromIndex("releases", "artistId", artistId));
  },
  async get(id) {
    return (await db()).get("releases", id);
  },
  async create(input: ReleaseInput) {
    const item: Release = { ...input, id: newId(), createdAt: now(), updatedAt: now() };
    await (await db()).put("releases", item);
    notifyChange();
    return item;
  },
  async update(id, patch) {
    const database = await db();
    const current = await database.get("releases", id);
    if (!current) throw new Error("앨범을 찾을 수 없어요.");
    const item: Release = { ...current, ...patch, id, updatedAt: now() };
    await database.put("releases", item);
    notifyChange();
    return item;
  },
  async remove(id) {
    await (await db()).delete("releases", id);
    notifyChange();
  },
};

const scraps: ScrapRepository = {
  async list() {
    const rows = await (await db()).getAll("scraps");
    return rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  },
  async add(newsId) {
    await (await db()).put("scraps", { newsId, savedAt: now() });
    notifyChange();
  },
  async remove(newsId) {
    await (await db()).delete("scraps", newsId);
    notifyChange();
  },
};

const images: ImageRepository = {
  async save(image: NewImage) {
    const row: ImageRow = { ...image, id: newId(), createdAt: now(), ownerKey: ownerKey(image.owner) };
    await (await db()).put("images", row);
    notifyChange();
    return stripOwnerKey(row);
  },
  async get(id) {
    const row = await (await db()).get("images", id);
    return row && stripOwnerKey(row);
  },
  async remove(id) {
    await (await db()).delete("images", id);
    notifyChange();
  },
  async listByOwner(owner) {
    const rows = await (await db()).getAllFromIndex("images", "ownerKey", ownerKey(owner));
    return rows.map(stripOwnerKey).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
};

const mySpaces: MySpaceRepository = {
  async get(artistId) {
    const row = await (await db()).get("mySpaces", artistId);
    return row ?? { artistId, followed: false, photoIds: [], updatedAt: now() };
  },
  async list() {
    return (await db()).getAll("mySpaces");
  },
  async save(space) {
    const row: MySpace = { ...space, updatedAt: now() };
    await (await db()).put("mySpaces", row);
    notifyChange();
    return row;
  },
  async remove(artistId) {
    await (await db()).delete("mySpaces", artistId);
    notifyChange();
  },
};

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function exportAll(): Promise<BackupFile> {
  const database = await db();
  const imageRows = await database.getAll("images");
  return {
    app: "wyd-now",
    version: 1,
    exportedAt: now(),
    artists: await database.getAll("artists"),
    schedules: await database.getAll("schedules"),
    mySpaces: await database.getAll("mySpaces"),
    votes: await database.getAll("votes"),
    news: await database.getAll("news"),
    scraps: await database.getAll("scraps"),
    releases: await database.getAll("releases"),
    images: await Promise.all(
      imageRows.map(async (row) => {
        const { blob, ...rest } = stripOwnerKey(row);
        return { ...rest, dataUrl: await blobToDataUrl(blob) };
      }),
    ),
  };
}

const STORES = ["artists", "schedules", "images", "mySpaces", "votes", "news", "scraps", "releases"] as const;

async function importAll(backup: BackupFile) {
  // blob 변환은 트랜잭션 밖에서 끝내야 트랜잭션이 자동 종료되지 않습니다.
  const imageRows: ImageRow[] = await Promise.all(
    backup.images.map(async ({ dataUrl, ...rest }) => {
      const blob = await (await fetch(dataUrl)).blob();
      return { ...rest, blob, ownerKey: ownerKey(rest.owner) };
    }),
  );
  const database = await db();
  const tx = database.transaction(STORES, "readwrite");
  await Promise.all(STORES.map((name) => tx.objectStore(name).clear()));
  await Promise.all([
    ...backup.artists.map((a) => tx.objectStore("artists").put(a)),
    ...backup.schedules.map((s) => tx.objectStore("schedules").put(s)),
    ...backup.mySpaces.map((m) => tx.objectStore("mySpaces").put(m)),
    ...(backup.votes ?? []).map((v) => tx.objectStore("votes").put(v)),
    ...(backup.news ?? []).map((n) => tx.objectStore("news").put(n)),
    ...(backup.scraps ?? []).map((m) => tx.objectStore("scraps").put(m)),
    ...(backup.releases ?? []).map((r) => tx.objectStore("releases").put(r)),
    ...imageRows.map((i) => tx.objectStore("images").put(i)),
  ]);
  await tx.done;
  notifyChange();
}

async function clearAll() {
  const database = await db();
  const tx = database.transaction(STORES, "readwrite");
  await Promise.all(STORES.map((name) => tx.objectStore(name).clear()));
  await tx.done;
  notifyChange();
}

export const indexedDbStore: DataStore = {
  schedules,
  artists,
  votes,
  news,
  images,
  mySpaces,
  scraps,
  releases,
  exportAll,
  importAll,
  clearAll,
};
