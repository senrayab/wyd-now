"use client";

import { Suspense, useSyncExternalStore, type ReactNode } from "react";
import { Loading } from "./ui";

const noopSubscribe = () => () => {};

/**
 * 정적 내보내기 시점(빌드)에는 날짜·IndexedDB·URL 쿼리를 알 수 없으므로
 * 화면 본문은 브라우저에서만 그립니다. (빌드 시점 날짜로 그려졌다가 바뀌는 불일치 방지)
 */
export default function ClientGate({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const fallback = <Loading />;
  if (!mounted) return fallback;
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
