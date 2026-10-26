"use client";

/*
 * '오늘 투표 완료' 체크 — 이 기기에만 저장하는 개인 기록.
 * 날짜가 바뀌면 자동으로 모두 풀립니다. (매일 투표하는 용도)
 */
import { useSyncExternalStore } from "react";
import { todayKey } from "./date";

const KEY = "wyd:vote-done";
const listeners = new Set<() => void>();
let cache: { date: string; ids: string[] } | null = null;

function read() {
  const today = todayKey();
  if (cache?.date === today) return cache;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    cache = saved?.date === today ? saved : { date: today, ids: [] };
  } catch {
    cache = { date: today, ids: [] };
  }
  return cache!;
}

const EMPTY = { date: "", ids: [] as string[] };

export function useVoteDone() {
  const state = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );

  function toggle(id: string) {
    const current = read();
    const ids = current.ids.includes(id) ? current.ids.filter((x) => x !== id) : [...current.ids, id];
    cache = { date: current.date, ids };
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
      // 저장이 막힌 환경에서는 이번 실행 동안만 유지
    }
    listeners.forEach((l) => l());
  }

  return { isDone: (id: string) => state.ids.includes(id), toggle, count: state.ids.length };
}
