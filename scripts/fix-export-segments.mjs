/*
 * Windows 에서 next build(output: export) 시 세그먼트 프리페치 파일이
 * `__next.calendar/__PAGE__.txt` 처럼 폴더로 잘못 만들어지는 문제를 바로잡습니다.
 * (Next 가 경로 구분자 `\` 를 `.` 로 바꾸지 못함 → 클라이언트는 `__next.calendar.__PAGE__.txt` 를 요청)
 * Linux(Cloudflare Pages 빌드)에서는 고칠 대상이 없어 아무것도 하지 않습니다.
 */
import { readdir, rename, rm, mkdir } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = fileURLToPath(new URL("../out", import.meta.url));

async function filesUnder(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((e) => (e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)])));
  return nested.flat();
}

async function fix(dir) {
  let moved = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    if (!entry.name.startsWith("__next.")) {
      moved += await fix(full);
      continue;
    }
    for (const file of await filesUnder(full)) {
      const rest = relative(full, file).split(sep).join(".");
      const target = join(dir, `${entry.name}.${rest}`);
      await mkdir(dirname(target), { recursive: true });
      await rename(file, target);
      moved += 1;
    }
    await rm(full, { recursive: true, force: true });
  }
  return moved;
}

const moved = await fix(outDir);
if (moved) console.log(`fix-export-segments: ${moved} segment files renamed`);
