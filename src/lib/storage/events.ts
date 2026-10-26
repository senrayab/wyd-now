/*
 * 저장소 변경 알림. 쓰기 작업 후 notifyChange() 를 부르면
 * useStoreQuery 로 구독 중인 화면이 다시 읽어 옵니다.
 */
type Listener = () => void;

const listeners = new Set<Listener>();
let version = 0;

export function notifyChange() {
  version += 1;
  listeners.forEach((l) => l());
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getVersion() {
  return version;
}
