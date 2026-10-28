import { getDataStore } from "../storage";
import type { Release, ReleaseInput, ReleaseKind } from "../storage/types";
import { applyImageChange, type ImageChange } from "./image-attach";
import { isValidUrl } from "./schedule-service";

export const RELEASE_KINDS: { id: ReleaseKind; label: string }[] = [
  { id: "album", label: "정규" },
  { id: "mini", label: "미니" },
  { id: "single", label: "싱글" },
  { id: "digital", label: "디지털 싱글" },
  { id: "ost", label: "OST" },
  { id: "etc", label: "기타" },
];

export function releaseKindLabel(kind: ReleaseKind) {
  return RELEASE_KINDS.find((k) => k.id === kind)?.label ?? "기타";
}

export type ReleaseFormValues = Omit<ReleaseInput, "imageId">;

export function validateRelease(values: ReleaseFormValues) {
  const errors: Partial<Record<"title" | "releaseDate" | "mvUrl" | "links", string>> = {};
  if (!values.title.trim()) errors.title = "앨범 이름을 입력해 주세요.";
  if (!values.releaseDate) errors.releaseDate = "발매일을 입력해 주세요.";
  if (values.mvUrl?.trim() && !isValidUrl(values.mvUrl)) errors.mvUrl = "http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.";
  if (values.links.some((l) => !l.label.trim() || !isValidUrl(l.url))) errors.links = "링크의 이름과 주소(https://…)를 확인해 주세요.";
  return errors;
}

export async function saveRelease(values: ReleaseFormValues, image: ImageChange, existing?: Release) {
  const { releases } = getDataStore();
  const clean: ReleaseFormValues = {
    ...values,
    title: values.title.trim(),
    tracks: values.tracks.map((t) => ({ ...t, title: t.title.trim() })).filter((t) => t.title),
    mvUrl: values.mvUrl?.trim() || undefined,
    description: values.description?.trim() || undefined,
    links: values.links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
  };
  if (existing) {
    const imageId = await applyImageChange(image, existing.imageId, { kind: "release", id: existing.id });
    return releases.update(existing.id, { ...clean, imageId });
  }
  const created = await releases.create({ ...clean, imageId: undefined });
  if (image.kind !== "replace") return created;
  const imageId = await applyImageChange(image, undefined, { kind: "release", id: created.id });
  return releases.update(created.id, { imageId });
}

export async function deleteRelease(release: Release) {
  const { releases, images } = getDataStore();
  if (release.imageId) await images.remove(release.imageId);
  await releases.remove(release.id);
}

/** 타이틀곡 이름들 (없으면 첫 곡) */
export function titleTracks(release: Release) {
  const titles = release.tracks.filter((t) => t.isTitle).map((t) => t.title);
  return titles.length ? titles : release.tracks.slice(0, 1).map((t) => t.title);
}
