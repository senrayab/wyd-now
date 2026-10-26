import type { DataStore } from "./repository";
import { indexedDbStore } from "./indexeddb";

/** 서버 DB 를 붙일 때 이 함수에서 구현체를 바꿉니다. */
export function getDataStore(): DataStore {
  return indexedDbStore;
}

export type * from "./types";
export type * from "./repository";
