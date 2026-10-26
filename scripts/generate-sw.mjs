/*
 * next build 후 실행: out/ 의 모든 정적 파일을 미리 캐시하는 out/sw.js 를 만듭니다.
 * 파일 내용으로 버전 해시를 만들어 배포할 때마다 이전 캐시가 정리되게 합니다.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "out");
const template = await readFile(join(root, "scripts", "sw-template.js"), "utf8");

// 미리 캐시하지 않을 파일 (sw 자신, 소스맵, Cloudflare 설정 파일)
const SKIP = [/^sw\.js$/, /\.map$/, /^_headers$/, /^_redirects$/];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])),
  );
  return files.flat();
}

const files = (await walk(outDir))
  .map((f) => relative(outDir, f).split(sep).join("/"))
  .filter((f) => !SKIP.some((re) => re.test(f)))
  .sort();

const hash = createHash("sha256");
for (const f of files) {
  hash.update(f);
  hash.update(await readFile(join(outDir, f)));
}
const version = hash.digest("hex").slice(0, 12);
const urls = files.map((f) => `/${f}`);

const sw = template
  .replace("__VERSION__", version)
  .replace("__PRECACHE__", JSON.stringify(urls));
await writeFile(join(outDir, "sw.js"), sw);

const bytes = (await Promise.all(files.map((f) => readFile(join(outDir, f))))).reduce((n, b) => n + b.length, 0);
console.log(`sw.js: ${urls.length} files precached (${(bytes / 1024).toFixed(0)} KB), version ${version}`);
