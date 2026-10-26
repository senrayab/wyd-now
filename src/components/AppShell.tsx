"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { WifiOff } from "lucide-react";
import BottomNav from "./BottomNav";
import { FeedbackProvider } from "./Feedback";
import { useOnline } from "@/lib/hooks";
import { listenForInstallPrompt } from "@/lib/install";
import { recordVisit } from "@/lib/nav-history";
import { cleanupLegacySamples } from "@/lib/services/legacy-cleanup";

/** 입력 화면에서는 하단 메뉴를 숨겨 실수로 벗어나지 않게 */
const HIDE_NAV = ["/schedule/new", "/schedule/edit", "/artist/new", "/artist/edit", "/vote/new", "/vote/edit", "/news/new", "/news/edit"];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const online = useOnline();
  const showNav = !HIDE_NAV.includes(pathname);

  useEffect(() => {
    recordVisit();
  }, [pathname]);

  useEffect(() => {
    listenForInstallPrompt();
    void cleanupLegacySamples();
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // 이미 서비스 워커가 있던 상태에서 새 버전이 제어권을 가져오면 한 번 새로고침해 새 화면 코드를 씀
    const hadController = !!navigator.serviceWorker.controller;
    const onControllerChange = () => {
      if (hadController) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 등록 실패해도 앱 사용에는 지장 없음
    });
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return (
    <FeedbackProvider>
      <div className="app" data-nav={showNav ? "shown" : "hidden"}>
        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={14} /> 오프라인 상태예요. 저장된 정보는 그대로 볼 수 있어요.
          </div>
        )}
        {children}
      </div>
      {/* 입력 화면에서도 메뉴를 없애지 않고 숨기기만 → 돌아왔을 때 선택 위치가 그대로 */}
      <BottomNav hidden={!showNav} />
    </FeedbackProvider>
  );
}
