/*
 * /api 함수 공통: 공개 웹 주소만 허용하고, 응답 시간을 제한해서 가져옵니다.
 * (onRequest 핸들러를 내보내지 않아서 주소로 노출되지 않음)
 */

const TIMEOUT_MS = 8000;

/** http(s) 이고 내부망·로컬 주소가 아닌 경우만 URL 로 돌려줌 */
export function parsePublicUrl(value) {
  if (!value) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return null;
  if (isPrivateIp(host)) return null;
  return url;
}

function isPrivateIp(host) {
  if (host.startsWith("[")) return true; // IPv6 주소 직접 입력은 받지 않음
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

export function fetchPublic(url, accept) {
  return fetch(url.href, {
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      accept,
      "accept-language": "ko-KR,ko;q=0.9,en;q=0.8",
      // 어떤 서비스의 요청인지 밝힘 (링크 미리보기 봇과 같은 방식)
      "user-agent": "Mozilla/5.0 (compatible; wyd-now link preview; +https://wyd-now.pages.dev)",
    },
  });
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function badRequest(error) {
  return json({ error }, 400);
}
