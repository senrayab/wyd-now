"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { hasInAppHistory } from "@/lib/nav-history";

interface Props {
  title?: ReactNode;
  /** 뒤로 가기. 방문 기록이 없으면 fallback 경로로 이동 */
  back?: string;
  actions?: ReactNode;
  compact?: boolean;
}

export function useBack(fallback: string) {
  const router = useRouter();
  return () => {
    if (hasInAppHistory()) router.back();
    else router.push(fallback);
  };
}

export default function PageHeader({ title, back, actions, compact }: Props) {
  const goBack = useBack(back ?? "/");
  return (
    <header className="page-header">
      {back && (
        <button type="button" className="icon-btn" onClick={goBack} aria-label="뒤로">
          <ChevronLeft size={22} />
        </button>
      )}
      <h1 className={compact ? "title-sm" : undefined}>{title}</h1>
      {actions ? <div className="header-actions">{actions}</div> : back && compact ? <span style={{ width: 44 }} /> : null}
    </header>
  );
}
