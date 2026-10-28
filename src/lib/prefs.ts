"use client";

/*
 * 화면 설정 (기기별). 데이터가 아니라 표시 방식이라 localStorage 에 둡니다.
 * 첫 화면 깜빡임을 막기 위해 layout 의 PREFS_SCRIPT 가 그리기 전에 <html> 에 반영합니다.
 */
import { useSyncExternalStore } from "react";

export interface Prefs {
  theme: "system" | "light" | "dark";
  fontKo: "pretendard" | "scdream";
  fontEn: "poppins" | "lato";
  weekStart: 0 | 1;
  hour12: boolean;
  calendarView: "month" | "list";
  voteLayout: "grid" | "list";
  /** 월간 캘린더에 투표 마감일을 옅은 점으로 표시 */
  showVoteDeadlines: boolean;
  /** 내 아티스트: "auto"(한 팀뿐이면 그 팀) · "all"(전체 보기) · 아티스트 id */
  focusArtist: string;
}

export const DEFAULT_PREFS: Prefs = {
  theme: "system",
  fontKo: "pretendard",
  fontEn: "poppins",
  weekStart: 0,
  hour12: false,
  calendarView: "month",
  voteLayout: "grid",
  showVoteDeadlines: false,
  focusArtist: "auto",
};

const KEY = "wyd:prefs";
const listeners = new Set<() => void>();
let cache: Prefs | null = null;

function read(): Prefs {
  if (cache) return cache;
  try {
    cache = { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    cache = DEFAULT_PREFS;
  }
  return cache!;
}

export function applyPrefsToDocument(prefs: Prefs) {
  const root = document.documentElement;
  root.dataset.fontKo = prefs.fontKo;
  root.dataset.fontEn = prefs.fontEn;
  if (prefs.theme === "system") delete root.dataset.theme;
  else root.dataset.theme = prefs.theme;
}

export function setPrefs(patch: Partial<Prefs>) {
  cache = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // 저장이 막힌 환경(시크릿 모드 등)에서는 이번 실행 동안만 유지
  }
  applyPrefsToDocument(cache);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS);
}

/** <head> 에 인라인으로 넣는 스크립트 (React 가 뜨기 전에 실행) */
export const PREFS_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})||"{}");var r=document.documentElement;if(p.fontKo)r.dataset.fontKo=p.fontKo;if(p.fontEn)r.dataset.fontEn=p.fontEn;if(p.theme&&p.theme!=="system")r.dataset.theme=p.theme;}catch(e){}})();`;
