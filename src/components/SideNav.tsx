"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Bookmark, CalendarPlus, PanelLeftClose, PanelLeftOpen, Plus, Search, Vote, type LucideIcon } from "lucide-react";
import { TABS } from "./BottomNav";
import styles from "./SideNav.module.css";

/** 탭 아래에 따로 두는 바로가기 (하단 메뉴에서는 더보기 안에 있음) */
const EXTRAS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/search", label: "검색", icon: Search },
  { href: "/my", label: "내 공간", icon: Bookmark },
];

/** 큰 화면에서 메뉴를 접어 둔 상태 (이 기기에만) */
export const SIDE_COLLAPSED_KEY = "wyd:side-collapsed";
const LARGE_QUERY = "(min-width: 1024px)";

function useLarge() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(LARGE_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(LARGE_QUERY).matches,
    () => false,
  );
}

/**
 * 태블릿·PC(768px~) 왼쪽 메뉴. 모바일은 CSS 로 숨김.
 * - 태블릿(~1023px): 아이콘만 있는 얇은 메뉴, 펼치면 화면 위에 덮이는 전체 메뉴
 * - PC(1024px~): 기본으로 펼쳐져 있고, 접으면 얇은 메뉴 (메뉴와 본문 묶음은 가운데 그대로)
 */
export default function SideNav() {
  const pathname = usePathname();
  const large = useLarge();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  // 다른 화면으로 이동하면 펼친 메뉴 · 등록 메뉴는 닫힘
  if ((addOpen || drawerOpen) && openedAt !== pathname) {
    setAddOpen(false);
    setDrawerOpen(false);
  }
  const extra = EXTRAS.find((e) => e.href === pathname);

  // 접어 둔 상태 불러오기
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDE_COLLAPSED_KEY) === "1");
    } catch {}
  }, []);

  const mode = large ? (collapsed ? "rail" : "full") : drawerOpen ? "drawer" : "rail";
  // 펼쳐져 있으면 홈 로고를 숨기도록 <html data-side> 에 표시 (첫 화면은 PREFS_SCRIPT 가 미리 맞춤)
  useEffect(() => {
    document.documentElement.dataset.side = mode === "full" ? "full" : "rail";
  }, [mode]);

  useEffect(() => {
    if (!drawerOpen && !addOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setDrawerOpen(false);
      setAddOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen, addOpen]);

  const expanded = mode !== "rail";
  function toggle() {
    setOpenedAt(pathname);
    setAddOpen(false);
    if (!large) {
      setDrawerOpen((v) => !v);
      return;
    }
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(SIDE_COLLAPSED_KEY, next ? "1" : "0");
    } catch {}
  }

  const item = (href: string, label: string, Icon: LucideIcon, active: boolean) => (
    <Link key={href} href={href} className={styles.item} data-active={active} aria-current={active ? "page" : undefined} aria-label={label} title={expanded ? undefined : label}>
      <Icon size={20} strokeWidth={active ? 2 : 1.7} />
      <span className={styles.label}>{label}</span>
    </Link>
  );

  return (
    <>
      <div className={styles.slot} data-mode={mode}>
        <aside className={styles.side} data-mode={mode} aria-label="주요 메뉴">
          <div className={styles.head}>
            <Link href="/" className={`logo ${styles.logo}`}>
              wyd now
            </Link>
            <button type="button" className={styles.toggle} onClick={toggle} aria-expanded={expanded} aria-label={expanded ? "메뉴 접기" : "메뉴 펼치기"} title={expanded ? "메뉴 접기" : "메뉴 펼치기"}>
              {expanded ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
            </button>
          </div>

          <button
            type="button"
            className={styles.add}
            data-open={addOpen}
            aria-expanded={addOpen}
            aria-label="등록"
            title={expanded ? undefined : "등록"}
            onClick={() => {
              setOpenedAt(pathname);
              setAddOpen((v) => !v);
            }}
          >
            <Plus size={19} strokeWidth={2} />
            <span className={styles.label}>등록</span>
          </button>
          {addOpen && (
            <div className={styles.addList}>
              <Link href="/schedule/new" aria-label="일정 등록" title={expanded ? undefined : "일정 등록"}>
                <CalendarPlus size={18} />
                <span className={styles.label}>일정 등록</span>
              </Link>
              <Link href="/vote/new" aria-label="투표 등록" title={expanded ? undefined : "투표 등록"}>
                <Vote size={18} />
                <span className={styles.label}>투표 등록</span>
              </Link>
            </div>
          )}

          <nav className={styles.nav}>
            {TABS.map((t) => item(t.href, t.label, t.icon, !extra && t.match(pathname)))}
            <span className={styles.divider} aria-hidden />
            {EXTRAS.map((e) => item(e.href, e.label, e.icon, extra === e))}
          </nav>
        </aside>
      </div>
      {/* 태블릿에서 펼친 메뉴: 바깥을 누르면 닫힘 */}
      {mode === "drawer" && createPortal(<div className={styles.backdrop} onClick={() => setDrawerOpen(false)} aria-hidden />, document.body)}
    </>
  );
}
