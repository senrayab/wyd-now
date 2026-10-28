"use client";

/*
 * 투표 북마크 — 이 기기에만 저장하는 개인 기록.
 * 투표 목록에서 북마크한 투표는 내 공간에 모이고, 거기서 오늘 투표 완료를 체크합니다.
 * 마감했거나 삭제된 투표는 내 공간을 열 때 자동으로 빠집니다(keepOnly).
 */
import { useSyncExternalStore } from "react";

const KEY = "wyd:vote-bookmarks";
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read() {
  if (cache) return cache;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(saved) ? saved : [];
  } catch {
    cache = [];
  }
  return cache!;
}

const EMPTY: string[] = [];

function write(next: string[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // 저장이 막힌 환경에서는 이번 실행 동안만 유지
  }
  listeners.forEach((l) => l());
}

function toggle(id: string) {
  const current = read();
  write(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
}

/** 남길 것만 남김 (마감·삭제된 투표 정리). 바뀐 게 없으면 저장하지 않음 */
function keepOnly(keep: (id: string) => boolean) {
  const current = read();
  const next = current.filter(keep);
  if (next.length !== current.length) write(next);
}

export function useVoteBookmarks() {
  const ids = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );

  return { ids, isBookmarked: (id: string) => ids.includes(id), toggle, keepOnly };
}
