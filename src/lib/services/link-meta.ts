/*
 * 기사 주소 → 제목·매체·날짜·요약·썸네일 불러오기
 * 실제 읽기는 Cloudflare Pages Function(/api/link-meta, /api/link-image)이 합니다.
 * 로컬 미리보기처럼 함수가 없는 환경에서는 LinkMetaError("unavailable") 로 실패합니다.
 */

export interface LinkMeta {
  title?: string;
  source?: string;
  /** YYYY-MM-DD */
  publishedAt?: string;
  summary?: string;
  /** 썸네일 원본 주소 */
  image?: string;
}

type LinkMetaErrorCode = "unavailable" | "blocked" | "not-found";

const MESSAGES: Record<LinkMetaErrorCode, string> = {
  unavailable: "지금은 기사 정보를 불러올 수 없어요. 직접 입력해 주세요.",
  blocked: "이 사이트는 정보를 가져오지 못하게 막혀 있어요. 직접 입력해 주세요.",
  "not-found": "기사에서 불러올 정보를 찾지 못했어요. 직접 입력해 주세요.",
};

export class LinkMetaError extends Error {
  constructor(public code: LinkMetaErrorCode) {
    super(MESSAGES[code]);
    this.name = "LinkMetaError";
  }
}

export async function fetchLinkMeta(url: string): Promise<LinkMeta> {
  let res: Response;
  try {
    res = await fetch(`/api/link-meta?url=${encodeURIComponent(url)}`);
  } catch {
    throw new LinkMetaError("unavailable");
  }
  // 함수가 없는 곳(로컬 정적 서버)에서는 HTML 404 가 옴
  if (!(res.headers.get("content-type") ?? "").includes("application/json")) throw new LinkMetaError("unavailable");
  if (!res.ok) throw new LinkMetaError(res.status === 400 ? "not-found" : "blocked");
  const meta = (await res.json()) as LinkMeta;
  if (!meta.title && !meta.summary && !meta.image) throw new LinkMetaError("not-found");
  return meta;
}

/** 썸네일을 같은 출처로 받아 File 로 (이후 WebP 변환에 그대로 사용) */
export async function fetchLinkImage(imageUrl: string): Promise<File> {
  const res = await fetch(`/api/link-image?url=${encodeURIComponent(imageUrl)}`);
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("image/")) throw new LinkMetaError("blocked");
  const blob = await res.blob();
  const name = decodeURIComponent(new URL(imageUrl).pathname.split("/").pop() || "thumbnail");
  return new File([blob], name, { type: blob.type || type });
}
