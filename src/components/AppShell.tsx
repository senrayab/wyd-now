"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { WifiOff } from "lucide-react";
import BottomNav from "./BottomNav";
import { FeedbackProvider } from "./Feedback";
import UpdateToast from "./UpdateToast";
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
    // 서비스 워커 등록·새 버전 알림은 UpdateToast 에서 (자동 새로고침 대신 알림을 눌러 바꿈)
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
      <UpdateToast />
    </FeedbackProvider>
  );
}
