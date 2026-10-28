/*
 * 저장된 기사 = 내 공간에 스크랩한 뉴스 기사만.
 * (직접 등록하던 ‘기사 모음’은 없앴고, 스크랩을 해제하면 기사 데이터도 함께 지웁니다)
 */
import { getDataStore } from "../storage";
import type { NewsItem } from "../storage/types";

async function removeNews(item: NewsItem) {
  const { news, images, scraps } = getDataStore();
  if (item.imageId) await images.remove(item.imageId);
  await scraps.remove(item.id);
  await news.remove(item.id);
}

/** 스크랩 해제: 스크랩과 저장해 둔 기사를 함께 지움 */
export async function unscrapNews(newsId: string) {
  const item = await getDataStore().news.get(newsId);
  if (item) await removeNews(item);
  else await getDataStore().scraps.remove(newsId);
}

/** 스크랩되지 않은 기사(예전 기사 모음 · 샘플 기사)를 지움. 지운 개수를 돌려줌 */
export async function removeUnscrappedNews() {
  const { news, scraps } = getDataStore();
  const kept = new Set((await scraps.list()).map((s) => s.newsId));
  const stale = (await news.list()).filter((n) => !kept.has(n.id));
  for (const item of stale) await removeNews(item);
  return stale.length;
}

/**
 * 기사 요약 다듬기
 * - 문단이 붙어 버린 "…됐다.‘Insomnia’는" 처럼 마침표 뒤 공백이 빠진 곳에 공백
 * - 언론사가 글자 수로 자른 요약("라이즈는 오")처럼 문장이 끝나지 않으면 말줄임표
 */
export function tidySummary(text: string) {
  const spaced = text.trim().replace(/([다요음함죠까네])([.!?])(?=[^\s.!?…"'”’)\]])/g, "$1$2 ");
  // 마침표가 없어도 "~했다", "~해요" 처럼 끝맺은 문장이면 그대로
  if (!spaced || /[.!?…。"'”’)\]]$/.test(spaced) || /[다요]$/.test(spaced)) return spaced;
  return `${spaced.replace(/[\s,·]+$/, "")}…`;
}

/** 주소에서 매체 이름 후보 (예: https://www.yna.co.kr/… → yna.co.kr) */
export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
