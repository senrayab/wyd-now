"use client";

/*
 * 내 아티스트(전용 모드)
 * 한 아티스트만 정해 두면 앱 전체가 그 아티스트 전용으로 동작합니다.
 * - 목록(홈·캘린더·투표·검색)은 그 아티스트와 연결된 것 + 아티스트 연결이 없는 공용 항목만
 * - 등록 화면은 아티스트 칸 없이 자동으로 연결, 상세 화면도 내 아티스트뿐이면 아티스트 칸을 숨김
 * 설정값은 기기별 화면 설정(prefs.focusArtist)이고, 데이터 구조는 그대로입니다.
 */
import { useArtists } from "./hooks";
import { usePrefs } from "./prefs";
import type { Artist } from "./storage/types";

export function useFocusArtist(): { focus: Artist | null; loading: boolean } {
  const { artists, loading } = useArtists();
  const { focusArtist } = usePrefs();
  if (focusArtist === "all") return { focus: null, loading };
  const chosen = artists.find((a) => a.id === focusArtist);
  // 따로 고르지 않았거나 고른 아티스트가 지워졌으면: 한 팀뿐일 때 그 팀
  return { focus: chosen ?? (artists.length === 1 ? artists[0] : null), loading };
}

/** 전용 모드에서 보여 줄 항목인지 (아티스트 연결이 없는 공용 항목은 항상 보여 줌) */
export function inFocus(artistIds: string[], focus: Artist | null) {
  return !focus || artistIds.length === 0 || artistIds.includes(focus.id);
}

/** 상세 화면의 아티스트 칸: 전용 모드에서 내 아티스트뿐이면 이미 그 공간이라 보여 줄 필요 없음 (다른 팀과 함께면 모두) */
export function artistsToShow(list: Artist[], focus: Artist | null) {
  return focus && list.every((a) => a.id === focus.id) ? [] : list;
}
