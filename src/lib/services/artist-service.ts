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

/** 아티스트 삭제: 프로필·배경 이미지, 디스코그래피, 내 공간(남아 있는 사진 포함)을 지우고 일정에서는 연결만 해제 */
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

/** 내 사진 기능을 없애면서: 기기에 남은 내 사진 이미지를 지우고 내 공간의 사진 목록을 비움. 지운 장수를 돌려줌 */
export async function removeAllMyPhotos() {
  const { mySpaces, images } = getDataStore();
  let removed = 0;
  for (const space of await mySpaces.list()) {
    const photos = await images.listByOwner({ kind: "my-photo", id: space.artistId });
    for (const p of photos) await images.remove(p.id);
    removed += photos.length;
    if (space.photoIds.length) await mySpaces.save({ ...space, photoIds: [] });
  }
  return removed;
}
