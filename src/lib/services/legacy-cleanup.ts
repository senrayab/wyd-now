/*
 * 예전 버전에 있던 가상 샘플(LUMINA·ORBIT9·SOLAR TIDE·한결)을 정리합니다.
 * 이름 + "샘플 ○○" 소속사가 모두 일치하는 아티스트만 대상이라 직접 등록한 정보는 건드리지 않습니다.
 * 정리한 경우 그 자리에 RIIZE 샘플을 넣습니다.
 */
import { getDataStore } from "../storage";
import { loadRiizeSampleNews, loadUrgentVoteSample } from "./riize-sample-news";
import { loadRiizeReleases, RELEASES_SAMPLE_KEY } from "./riize-sample-releases";
import { hasRiize, loadRiizeTestData } from "./riize-test-data";

const LEGACY = new Map([
  ["LUMINA", "샘플 엔터테인먼트"],
  ["ORBIT9", "샘플 뮤직"],
  ["SOLAR TIDE", "샘플 레이블"],
  ["한결", "샘플 스튜디오"],
]);

let running: Promise<boolean> | null = null;

/** 앱 시작 시 한 번: 예전 가상 샘플 정리 + 새 샘플 추가 */
export function cleanupLegacySamples() {
  running ??= run();
  return running;
}

const SAMPLE_V2_KEY = "wyd:sample-v2";

/** RIIZE 샘플을 이미 넣은 기기에 새로 생긴 샘플(기사·마감 임박 투표)을 한 번만 추가 */
async function addNewSamples() {
  try {
    if (localStorage.getItem(SAMPLE_V2_KEY)) return;
  } catch {
    return;
  }
  const riize = (await getDataStore().artists.list()).find((a) => a.name.toUpperCase() === "RIIZE");
  if (!riize) return;
  await loadRiizeSampleNews(riize.id);
  await loadUrgentVoteSample(riize.id);
  try {
    localStorage.setItem(SAMPLE_V2_KEY, "1");
  } catch {
    // 저장이 막힌 환경: 다음 실행 때 다시 시도해도 중복은 주소·이름으로 걸러짐
  }
}

/** RIIZE 가 있는 기기에 디스코그래피 샘플을 한 번만 추가 (지운 앨범이 다시 생기지 않게 표시를 남김) */
async function addReleaseSamples() {
  try {
    if (localStorage.getItem(RELEASES_SAMPLE_KEY)) return;
  } catch {
    return;
  }
  const riize = (await getDataStore().artists.list()).find((a) => a.name.toUpperCase() === "RIIZE");
  if (!riize) return;
  await loadRiizeReleases(riize.id);
}

async function run() {
  await removeLegacy();
  await addNewSamples();
  await addReleaseSamples();
  return true;
}

async function removeLegacy() {
  const store = getDataStore();
  // has() 먼저: 목록에 없는 이름이면 get() 이 undefined 라, 소속사를 비운 아티스트(agency undefined)와 같다고 판단해 지우던 문제 방지
  const legacy = (await store.artists.list()).filter((a) => LEGACY.has(a.name) && LEGACY.get(a.name) === a.agency);
  if (legacy.length === 0) return false;

  const ids = new Set(legacy.map((a) => a.id));
  const schedules = await store.schedules.list();
  for (const s of schedules) {
    if (s.artistIds.length === 0 || !s.artistIds.some((id) => ids.has(id))) continue;
    const rest = s.artistIds.filter((id) => !ids.has(id));
    if (rest.length) {
      await store.schedules.update(s.id, { artistIds: rest });
    } else {
      if (s.imageId) await store.images.remove(s.imageId);
      await store.schedules.remove(s.id);
    }
  }
  for (const artist of legacy) {
    const photos = await store.images.listByOwner({ kind: "my-photo", id: artist.id });
    await Promise.all(photos.map((p) => store.images.remove(p.id)));
    if (artist.imageId) await store.images.remove(artist.imageId);
    await store.mySpaces.remove(artist.id);
    await store.artists.remove(artist.id);
  }

  if (!(await hasRiize())) await loadRiizeTestData();
  return true;
}
