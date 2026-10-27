/*
 * Cloudflare Pages Function — GET /api/link-image?url=<이미지 주소>
 *
 * 기사 썸네일(og:image)을 앱으로 가져오기 위한 중계. 브라우저가 다른 사이트 이미지를
 * 읽어 WebP 로 바꾸려면 CORS 허용이 필요해서, 이 함수가 받아 같은 주소로 넘겨 줍니다.
 * 이미지 형식·크기(20MB)만 확인하고 그대로 전달하며 서버에 저장하지 않습니다.
 */
import { badRequest, fetchPublic, json, parsePublicUrl } from "./_shared.js";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export async function onRequestGet({ request }) {
  const target = parsePublicUrl(new URL(request.url).searchParams.get("url"));
  if (!target) return badRequest("invalid-url");

  let res;
  try {
    res = await fetchPublic(target, "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*");
  } catch {
    return json({ error: "fetch-failed" }, 502);
  }
  if (!res.ok) return json({ error: "fetch-failed", status: res.status }, 502);

  const type = res.headers.get("content-type") ?? "";
  if (!/^image\//i.test(type)) return json({ error: "not-image" }, 422);
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_IMAGE_BYTES) return json({ error: "too-large" }, 413);

  return new Response(res.body, {
    headers: { "content-type": type, "cache-control": "public, max-age=86400" },
  });
}
