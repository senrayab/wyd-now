import type { WebPResult } from "../image/image-service";
import { getDataStore } from "../storage";
import type { ImageOwner } from "../storage/types";

/** 폼에서 이미지 필드가 어떻게 바뀌었는지 */
export type ImageChange =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "replace"; webp: WebPResult };

/** 변경 사항을 저장소에 반영하고 최종 imageId 를 돌려줍니다. */
export async function applyImageChange(
  change: ImageChange,
  currentId: string | undefined,
  owner: ImageOwner,
): Promise<string | undefined> {
  const { images } = getDataStore();
  if (change.kind === "keep") return currentId;
  if (currentId) await images.remove(currentId);
  if (change.kind === "remove") return undefined;
  const { blob, baseName, width, height } = change.webp;
  const saved = await images.save({
    blob,
    mimeType: "image/webp",
    baseName,
    width,
    height,
    size: blob.size,
    owner,
  });
  return saved.id;
}
