/*
 * wyd now service worker (scripts/generate-sw.mjs 가 out/sw.js 로 생성)
 * - 앱 화면/정적 파일: 설치 시 전부 미리 캐시 → 오프라인에서도 열림
 * - 페이지 이동: 네트워크 우선, 실패하면 캐시 → 그래도 없으면 offline.html
 * - 외부 글꼴(jsDelivr): 쓰는 순간 런타임 캐시
 * - 사용자 데이터는 IndexedDB 에 있어 여기서 다루지 않음 (캐시와 분리)
 */
const VERSION = "__VERSION__";
const PRECACHE = `wyd-precache-${VERSION}`;
const RUNTIME = "wyd-runtime-v1";
const PRECACHE_URLS = __PRECACHE__;
const RUNTIME_HOSTS = ["cdn.jsdelivr.net", "fastly.jsdelivr.net"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith("wyd-precache-") && k !== PRECACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** /schedule → /schedule.html, / → /index.html (정적 내보내기 파일명) */
function htmlPathFor(pathname) {
  if (pathname === "/" || pathname === "") return "/index.html";
  const clean = pathname.replace(/\/$/, "");
  return /\.[a-z0-9]+$/i.test(clean) ? clean : `${clean}.html`;
}

/**
 * Cloudflare Pages 는 /x.html → /x 로 308 리다이렉트하므로 캐시된 응답에 redirected 표시가 남음.
 * Safari 는 리다이렉트된 응답으로 페이지 이동을 응답하면 거부하므로 깨끗한 응답으로 다시 만듦.
 */
function unredirect(response) {
  if (!response || !response.redirected) return response;
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function fromPrecache(pathname) {
  const cache = await caches.open(PRECACHE);
  return unredirect((await cache.match(pathname)) || (await cache.match(htmlPathFor(pathname))));
}

async function handleNavigation(request) {
  const url = new URL(request.url);
  try {
    const response = await fetch(request);
    if (response.ok) return response;
    return (await fromPrecache(url.pathname)) || response;
  } catch {
    return (
      (await fromPrecache(url.pathname)) ||
      unredirect(await caches.match("/offline.html", { cacheName: PRECACHE }))
    );
  }
}

async function handleSameOrigin(request) {
  const url = new URL(request.url);
  // RSC 페이로드 등은 ?_rsc= 쿼리가 붙으므로 경로만으로 찾음
  const cached = await fromPrecache(url.pathname);
  if (cached && url.pathname.startsWith("/_next/static/")) return cached;
  try {
    const response = await fetch(request);
    return response.ok || !cached ? response : cached;
  } catch {
    if (cached) return cached;
    throw new Error("offline");
  }
}

async function handleRuntime(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // /api (Pages Functions) 는 항상 네트워크로 — 캐시하지 않음
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(handleNavigation(request));
  } else if (url.origin === self.location.origin) {
    event.respondWith(handleSameOrigin(request));
  } else if (RUNTIME_HOSTS.includes(url.hostname)) {
    event.respondWith(handleRuntime(request));
  }
});
