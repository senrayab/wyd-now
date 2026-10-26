"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, Ellipsis, House, Plus, Vote, type LucideIcon } from "lucide-react";
import styles from "./BottomNav.module.css";

interface Tab {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
}

/** 가운데 + 버튼을 기준으로 왼쪽 2개 · 오른쪽 2개 */
const LEFT: Tab[] = [
  { href: "/", label: "홈", icon: House, match: (p) => p === "/" },
  { href: "/calendar", label: "캘린더", icon: CalendarDays, match: (p) => p.startsWith("/calendar") || p.startsWith("/schedule") || p === "/search" },
];
const RIGHT: Tab[] = [
  { href: "/votes", label: "투표", icon: Vote, match: (p) => p === "/votes" || p === "/vote" || p.startsWith("/vote/") },
  // 아티스트·소식·내 공간은 더보기 안에 있으므로 더보기로 표시
  { href: "/more", label: "더보기", icon: Ellipsis, match: (p) => p.startsWith("/more") || p.startsWith("/artist") || p.startsWith("/news") || p === "/my" },
];
const TABS = [...LEFT, ...RIGHT];

export default function BottomNav({ hidden = false }: { hidden?: boolean }) {
  const pathname = usePathname();
  const activeIndex = TABS.findIndex((t) => t.match(pathname));
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  // 선택 배경을 선택된 탭의 위치·너비로 옮김 (CSS transition 으로 미끄러지듯 이동)
  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    const place = () => {
      const tab = tabRefs.current[activeIndex];
      if (!tab) {
        indicator.style.opacity = "0";
        return;
      }
      // 탭은 왼쪽·오른쪽 묶음 안에 있으므로 바 기준 위치로 계산
      const bar = indicator.parentElement!.getBoundingClientRect();
      const rect = tab.getBoundingClientRect();
      indicator.style.opacity = "1";
      indicator.style.width = `${rect.width}px`;
      indicator.style.transform = `translateX(${rect.left - bar.left}px)`;
    };
    place();
    // 첫 배치는 애니메이션 없이, 이후 이동부터 애니메이션
    requestAnimationFrame(() => (indicator.dataset.ready = "true"));
    // 글꼴 로딩·화면 크기 변화로 탭 너비가 바뀌면 다시 맞춤
    const observer = new ResizeObserver(place);
    tabRefs.current.forEach((tab) => tab && observer.observe(tab));
    return () => observer.disconnect();
  }, [activeIndex]);

  const renderTab = ({ href, label, icon: Icon }: Tab, i: number) => {
    const active = i === activeIndex;
    return (
      <Link
        key={href}
        ref={(el) => {
          tabRefs.current[i] = el;
        }}
        href={href}
        className={styles.tab}
        data-active={active}
        aria-current={active ? "page" : undefined}
        aria-label={label}
      >
        <Icon size={21} strokeWidth={active ? 2 : 1.7} />
        <span className={styles.label}>{label}</span>
      </Link>
    );
  };

  return (
    <nav className={styles.wrap} aria-label="주요 메뉴" data-hidden={hidden} aria-hidden={hidden || undefined} inert={hidden || undefined}>
      <div className={styles.bar}>
        {/* 바 모양: 왼쪽 · 가운데(부드럽게 파인 곡선) · 오른쪽 — + 버튼 둘레는 투명 */}
        <span className={styles.shape} aria-hidden>
          <span className={styles.side} />
          {/*
            + 버튼(지름 56, 중심은 바 위 2px)과 같은 중심의 반지름 34 원으로 파고,
            양 어깨만 작은 곡선으로 이어 부드럽게.
          */}
          <span className={styles.notch}>
            <svg viewBox="0 0 120 70">
              <path d="M0 0 H18 C23 0 25.87 5.97 27.16 10.8 A34 34 0 0 0 92.84 10.8 C94.13 5.97 97 0 102 0 H120 V70 H0 Z" />
            </svg>
            <span />
          </span>
          <span className={styles.side} />
        </span>
        <span ref={indicatorRef} className={styles.indicator} aria-hidden />
        <div className={styles.group}>{LEFT.map((t, i) => renderTab(t, i))}</div>
        <span className={styles.gap} aria-hidden />
        <div className={styles.group}>{RIGHT.map((t, i) => renderTab(t, LEFT.length + i))}</div>
      </div>
      <Link href="/schedule/new" className={styles.add} aria-label="일정 등록">
        <Plus size={24} strokeWidth={2} />
      </Link>
    </nav>
  );
}
