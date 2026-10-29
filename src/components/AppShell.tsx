"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { WifiOff } from "lucide-react";
import BottomNav from "./BottomNav";
import SideNav from "./SideNav";
import { FeedbackProvider } from "./Feedback";
import UpdateToast from "./UpdateToast";
import { useOnline } from "@/lib/hooks";
import { listenForInstallPrompt } from "@/lib/install";
import { recordVisit } from "@/lib/nav-history";
import { cleanupLegacySamples } from "@/lib/services/legacy-cleanup";

/** 입력 화면에서는 하단 메뉴를 숨겨 실수로 벗어나지 않게 */
const HIDE_NAV = ["/schedule/new", "/schedule/edit", "/artist/new", "/artist/edit", "/vote/new", "/vote/edit"];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const online = useOnline();
  const showNav = !HIDE_NAV.includes(pathname);

  useEffect(() => {
    recordVisit();
  }, [pathname]);

  // 태블릿·PC: 탭·칩 줄(.sticky-controls)이 제목줄 바로 아래에 붙었는지 표시 → 배경을 한 장으로 (globals.css)
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const app = document.querySelector<HTMLElement>(".app");
      const head = app ? parseFloat(getComputedStyle(app).getPropertyValue("--head-h")) || 0 : 0;
      document.querySelectorAll<HTMLElement>(".sticky-controls").forEach((el) => {
        const stuck = head > 0 && el.getBoundingClientRect().top <= head + 0.5;
        if (stuck) el.dataset.stuck = "";
        else delete el.dataset.stuck;
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    // 화면 안에서 보기를 바꿔도(캘린더 월간 ↔ 목록) 다시 확인
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  useEffect(() => {
    listenForInstallPrompt();
    void cleanupLegacySamples();
    // 서비스 워커 등록·새 버전 알림은 UpdateToast 에서 (자동 새로고침 대신 알림을 눌러 바꿈)
  }, []);

  return (
    <FeedbackProvider>
      {/* 태블릿·PC(768px~): 왼쪽 메뉴 + 본문. 모바일은 본문만 */}
      <div className="shell">
        <SideNav />
        <div className="app" data-nav={showNav ? "shown" : "hidden"}>
          {!online && (
            <div className="offline-banner" role="status">
              <WifiOff size={14} /> 오프라인 상태예요. 저장된 정보는 그대로 볼 수 있어요.
            </div>
          )}
          {children}
        </div>
      </div>
      {/* 입력 화면에서도 메뉴를 없애지 않고 숨기기만 → 돌아왔을 때 선택 위치가 그대로 */}
      <BottomNav hidden={!showNav} />
      <UpdateToast />
    </FeedbackProvider>
  );
}
