"use client";

import { useEffect, useState } from "react";
import styles from "./UpdateToast.module.css";

/**
 * 새 버전 알림: 새로 배포된 버전이 준비되면 아래에 작은 안내 한 줄("새로고침해 주세요")을 띄움.
 * (자동 새로고침은 입력하던 내용을 날릴 수 있어서 하지 않음)
 * - 시작할 때 서비스 워커 등록 → 새 버전이 있으면 설치 → 제어권을 넘겨받으면(controllerchange) 알림
 * - 오래 켜 둔 앱도 알 수 있게, 화면으로 돌아올 때마다 새 버전을 확인
 */
export default function UpdateToast() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // 처음 설치될 때(이전 버전이 없을 때)는 알릴 필요 없음. 첫 방문 중에 새 버전이 오는 경우도 있어서 바뀔 때마다 갱신
    let hadController = !!navigator.serviceWorker.controller;
    const onControllerChange = () => {
      if (hadController) setReady(true);
      hadController = true;
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let registration: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker
      .register("/sw.js")
      .then((r) => (registration = r))
      .catch(() => {
        // 등록 실패해도 앱 사용에는 지장 없음
      });
    const onVisible = () => {
      if (document.visibilityState === "visible") registration?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!ready) return null;
  // 버튼 없이 안내 한 줄. 홈 화면 앱에는 새로고침 버튼이 없어서 안내를 눌러도 새로고침되게
  return (
    <div className={styles.toast} role="status" onClick={() => window.location.reload()}>
      새 버전이 있어요. 새로고침해 주세요.
    </div>
  );
}
