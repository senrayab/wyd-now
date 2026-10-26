"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getDataStore } from "./storage";
import { getVersion, subscribe } from "./storage/events";
import type { DataStore } from "./storage/repository";

interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
}

/**
 * 저장소 조회 훅. key 가 바뀌거나 저장소에 쓰기가 일어나면 다시 읽습니다.
 */
export function useStoreQuery<T>(query: (store: DataStore) => Promise<T>, key: string): QueryState<T> {
  const version = useSyncExternalStore(subscribe, getVersion, () => 0);
  const queryRef = useRef(query);
  const [state, setState] = useState<QueryState<T> & { for?: string }>({
    data: undefined,
    loading: true,
    error: null,
  });

  useEffect(() => {
    queryRef.current = query;
  });

  useEffect(() => {
    let alive = true;
    queryRef
      .current(getDataStore())
      .then((data) => alive && setState({ data, loading: false, error: null, for: key }))
      .catch((error: Error) => alive && setState({ data: undefined, loading: false, error, for: key }));
    return () => {
      alive = false;
    };
  }, [key, version]);

  // key 가 바뀐 직후 이전 결과를 잠깐 보여주지 않도록
  if (state.for !== undefined && state.for !== key) return { data: undefined, loading: true, error: null };
  return state;
}

/** 저장된 이미지(Blob)를 화면에 표시할 object URL 로. 사용 후 자동 해제 */
export function useImageUrl(imageId: string | undefined) {
  const { data: image } = useStoreQuery((s) => (imageId ? s.images.get(imageId) : Promise.resolve(undefined)), `img:${imageId}`);
  const [url, setUrl] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (!image) return;
    const objectUrl = URL.createObjectURL(image.blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL 은 외부 리소스라 effect 에서 생성·해제
    setUrl({ id: image.id, url: objectUrl });
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  return image && url?.id === image.id ? { url: url.url, image } : { url: undefined, image };
}

export function useArtists() {
  const { data, loading } = useStoreQuery((s) => s.artists.list(), "artists");
  const list = data ?? [];
  return { artists: list, map: new Map(list.map((a) => [a.id, a])), loading };
}

export function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}
