import { convertToWebP } from "../image/image-service";
import { getDataStore } from "../storage";
import type { Artist, ArtistInput } from "../storage/types";
import { applyImageChange, type ImageChange } from "./image-attach";
import { isValidUrl } from "./schedule-service";

export type ArtistFormValues = Omit<ArtistInput, "imageId">;

export function validateArtist(values: ArtistFormValues) {
  const errors: Partial<Record<"name" | "links" | "members", string>> = {};
  if (!values.name.trim()) errors.name = "이름을 입력해 주세요.";
  if (values.members.some((m) => !m.name.trim())) errors.members = "비어 있는 멤버 이름이 있어요.";
  if (values.links.some((l) => !l.label.trim() || !isValidUrl(l.url))) {
    errors.links = "링크의 이름과 주소(https://…)를 확인해 주세요.";
  }
  return errors;
}

export async function saveArtist(values: ArtistFormValues, image: ImageChange, existing?: Artist) {
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
    const imageId = await applyImageChange(image, existing.imageId, { kind: "artist", id: existing.id });
    return artists.update(existing.id, { ...clean, imageId });
  }
  const created = await artists.create({ ...clean, imageId: undefined });
  if (image.kind !== "replace") return created;
  const imageId = await applyImageChange(image, undefined, { kind: "artist", id: created.id });
  return artists.update(created.id, { imageId });
}

/** 아티스트 삭제: 프로필 이미지, 내 공간(사진 포함)을 지우고 일정에서는 연결만 해제 */
export async function deleteArtist(artist: Artist) {
  const store = getDataStore();
  if (artist.imageId) await store.images.remove(artist.imageId);
  const photos = await store.images.listByOwner({ kind: "my-photo", id: artist.id });
  await Promise.all(photos.map((p) => store.images.remove(p.id)));
  await store.mySpaces.remove(artist.id);
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

export async function setBiasMember(artistId: string, biasMemberId: string | undefined) {
  const { mySpaces } = getDataStore();
  const space = await mySpaces.get(artistId);
  return mySpaces.save({ ...space, biasMemberId });
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
