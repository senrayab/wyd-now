import { getDataStore } from "../storage";
import type { NewsInput, NewsItem } from "../storage/types";
import { applyImageChange, type ImageChange } from "./image-attach";
import { isValidUrl } from "./schedule-service";

export type NewsFormValues = Omit<NewsInput, "imageId">;

export function validateNews(values: NewsFormValues) {
  const errors: Partial<Record<"title" | "url", string>> = {};
  if (!values.title.trim()) errors.title = "기사 제목을 입력해 주세요.";
  if (!isValidUrl(values.url)) errors.url = "기사 주소(https://…)를 입력해 주세요.";
  return errors;
}

export async function saveNews(values: NewsFormValues, image: ImageChange, existing?: NewsItem) {
  const { news } = getDataStore();
  const clean: NewsFormValues = {
    ...values,
    title: values.title.trim(),
    url: values.url.trim(),
    source: values.source?.trim() || undefined,
    summary: values.summary?.trim() || undefined,
  };
  if (existing) {
    const imageId = await applyImageChange(image, existing.imageId, { kind: "news", id: existing.id });
    return news.update(existing.id, { ...clean, imageId });
  }
  const created = await news.create({ ...clean, imageId: undefined });
  if (image.kind !== "replace") return created;
  const imageId = await applyImageChange(image, undefined, { kind: "news", id: created.id });
  return news.update(created.id, { imageId });
}

export async function deleteNews(item: NewsItem) {
  const { news, images, scraps } = getDataStore();
  if (item.imageId) await images.remove(item.imageId);
  await scraps.remove(item.id);
  await news.remove(item.id);
}

/** 주소에서 매체 이름 후보 (예: https://www.yna.co.kr/… → yna.co.kr) */
export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
