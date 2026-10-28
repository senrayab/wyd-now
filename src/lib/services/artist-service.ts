import { convertToWebP } from "../image/image-service";
import { getDataStore } from "../storage";
import type { Artist, ArtistInput, MySpace } from "../storage/types";
import { applyImageChange, type ImageChange } from "./image-attach";
import { isValidUrl } from "./schedule-service";

export type ArtistFormValues = Omit<ArtistInput, "imageId" | "coverImageId">;

export function validateArtist(values: ArtistFormValues) {
  const errors: Partial<Record<"name" | "links" | "members", string>> = {};
  if (!values.name.trim()) errors.name = "이름을 입력해 주세요.";
  if (values.members.some((m) => !m.name.trim())) errors.members = "비어 있는 멤버 이름이 있어요.";
  if (values.links.some((l) => !l.label.trim() || !isValidUrl(l.url))) {
    errors.links = "링크의 이름과 주소(https://…)를 확인해 주세요.";
  }
  return errors;
}

export async function saveArtist(values: ArtistFormValues, image: ImageChange, existing?: Artist, cover: ImageChange = { kind: "keep" }) {
  const { artists } = getDataStore();
  const clean: ArtistFormValues = {
    ...values,
    name: values.name.trim(),
    agency: values.agency?.trim() || undefined,
    fandom: values.fandom?.trim() || undefined,
    debutDate: values.debutDate || undefined,
    members: values.type === "group" ? values.members.map((m) => ({ ...m, name: m.name.trim() })) : [],
    links: values.links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
  };
  if (existing) {
    const owner = { kind: "artist", id: existing.id } as const;
    const imageId = await applyImageChange(image, existing.imageId, owner);
    const coverImageId = await applyImageChange(cover, existing.coverImageId, owner);
    return artists.update(existing.id, { ...clean, imageId, coverImageId });
  }
  const created = await artists.create({ ...clean, imageId: undefined, coverImageId: undefined });
  if (image.kind !== "replace" && cover.kind !== "replace") return created;
  const owner = { kind: "artist", id: created.id } as const;
  const imageId = await applyImageChange(image, undefined, owner);
  const coverImageId = await applyImageChange(cover, undefined, owner);
  return artists.update(created.id, { imageId, coverImageId });
}

/** 아티스트 삭제: 프로필·배경 이미지, 디스코그래피, 내 공간(사진 포함)을 지우고 일정에서는 연결만 해제 */
export async function deleteArtist(artist: Artist) {
  const store = getDataStore();
  if (artist.imageId) await store.images.remove(artist.imageId);
  if (artist.coverImageId) await store.images.remove(artist.coverImageId);
  const photos = await store.images.listByOwner({ kind: "my-photo", id: artist.id });
  await Promise.all(photos.map((p) => store.images.remove(p.id)));
  await store.mySpaces.remove(artist.id);
  for (const r of await store.releases.listByArtist(artist.id)) {
    if (r.imageId) await store.images.remove(r.imageId);
    await store.releases.remove(r.id);
  }
  const linked = await store.schedules.listByArtist(artist.id);
  await Promise.all(
    linked.map((s) => store.schedules.update(s.id, { artistIds: s.artistIds.filter((id) => id !== artist.id) })),
  );
  const votes = (await store.votes.list()).filter((v) => v.artistIds.includes(artist.id));
  await Promise.all(votes.map((v) => store.votes.update(v.id, { artistIds: v.artistIds.filter((id) => id !== artist.id) })));
  const news = (await store.news.list()).filter((n) => n.artistIds.includes(artist.id));
  await Promise.all(news.map((n) => store.news.update(n.id, { artistIds: n.artistIds.filter((id) => id !== artist.id) })));
  await store.artists.remove(artist.id);
}

/* ---- 아티스트 페이지의 내 공간 ---- */

export async function setFollowed(artistId: string, followed: boolean) {
  const { mySpaces } = getDataStore();
  const space = await mySpaces.get(artistId);
  return mySpaces.save({ ...space, followed });
}

export const MAX_BIAS = 2;

/** 최애 멤버 id 목록 (예전 한 명 값도 함께 읽음) */
export function biasIdsOf(space: MySpace): string[] {
  return space.biasMemberIds ?? (space.biasMemberId ? [space.biasMemberId] : []);
}

/** 최애 멤버 켜고 끄기. 이미 두 명이면 "full" 을 돌려주고 바꾸지 않음 */
export async function toggleBiasMember(artistId: string, memberId: string): Promise<"added" | "removed" | "full"> {
  const { mySpaces } = getDataStore();
  const space = await mySpaces.get(artistId);
  const ids = biasIdsOf(space);
  if (ids.includes(memberId)) {
    await mySpaces.save({ ...space, biasMemberIds: ids.filter((id) => id !== memberId), biasMemberId: undefined });
    return "removed";
  }
  if (ids.length >= MAX_BIAS) return "full";
  await mySpaces.save({ ...space, biasMemberIds: [...ids, memberId], biasMemberId: undefined });
  return "added";
}

export const MAX_MY_PHOTOS = 12;

export async function addMyPhoto(artistId: string, file: File) {
  const { mySpaces, images } = getDataStore();
  const space = await mySpaces.get(artistId);
  if (space.photoIds.length >= MAX_MY_PHOTOS) {
    throw new Error(`사진은 아티스트마다 ${MAX_MY_PHOTOS}장까지 보관할 수 있어요.`);
  }
  const webp = await convertToWebP(file);
  const saved = await images.save({
    blob: webp.blob,
    mimeType: "image/webp",
    baseName: webp.baseName,
    width: webp.width,
    height: webp.height,
    size: webp.blob.size,
    owner: { kind: "my-photo", id: artistId },
  });
  await mySpaces.save({ ...space, photoIds: [...space.photoIds, saved.id] });
  return saved;
}

export async function removeMyPhoto(artistId: string, photoId: string) {
  const { mySpaces, images } = getDataStore();
  const space = await mySpaces.get(artistId);
  await images.remove(photoId);
  await mySpaces.save({ ...space, photoIds: space.photoIds.filter((id) => id !== photoId) });
}
