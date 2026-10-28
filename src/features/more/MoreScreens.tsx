"use client";

import Link from "next/link";
import { Bookmark, ChevronRight, Sparkles } from "lucide-react";
import HomeLink from "@/components/HomeLink";
import PageHeader from "@/components/PageHeader";
import { ArtistAvatar } from "@/components/ui";
import { useFocusArtist } from "@/lib/focus";
import { MORE_MENU, getSection, type MenuSection } from "./menu";
import styles from "./More.module.css";

export function MoreHome() {
  const { focus } = useFocusArtist();
  return (
    <main>
      <header className="page-header">
        <HomeLink />
        <h1>더보기</h1>
      </header>

      <Link href="/more/support/install" className={`card ${styles.appCard}`}>
        <span className={styles.appText}>
          <strong className="logo">wyd now</strong>
          <small>아티스트 스케줄 · 투표 모음</small>
        </span>
        <span className={styles.installPill}>앱 설치</span>
      </Link>

      <Link href={focus ? `/artist?id=${focus.id}` : "/artists"} className={`card ${styles.my}`}>
        {focus ? (
          <ArtistAvatar artist={focus} size={40} />
        ) : (
          <span className={styles.myIcon} data-tone="ink" aria-hidden>
            <Sparkles size={18} />
          </span>
        )}
        <span className={styles.myText}>
          <strong>{focus ? focus.name : "아티스트"}</strong>
          <small>프로필 · 일정 · 소식 · MY 공간</small>
        </span>
        <ChevronRight size={17} className="muted" />
      </Link>

      <Link href="/my" className={`card ${styles.my}`}>
        <span className={styles.myIcon} aria-hidden>
          <Bookmark size={18} />
        </span>
        <span className={styles.myText}>
          <strong>내 공간</strong>
          <small>스크랩한 기사 · 팔로우 · 오늘 투표</small>
        </span>
        <ChevronRight size={17} className="muted" />
      </Link>

      {/* 메뉴 목록: 아이콘 + 이름 */}
      <nav className={`card ${styles.menu}`} aria-label="더보기 메뉴">
        {MORE_MENU.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.id} href={section.href} className={styles.menuItem}>
              <span className={styles.menuIcon}>
                <Icon size={19} />
              </span>
              <span className={styles.menuLabel}>
                <strong>{section.label}</strong>
                <small>{section.items.map((i) => i.label).join(" · ")}</small>
              </span>
              <ChevronRight size={17} className="muted" />
            </Link>
          );
        })}
      </nav>

      <Link href="/more/support/help" className={`card ${styles.help}`}>
        <span>
          <strong>궁금한 점이 있나요?</strong>
          <small>자주 묻는 질문을 모아 두었어요.</small>
        </span>
        <span className="btn btn-primary btn-sm">도움말</span>
      </Link>
    </main>
  );
}

export function MenuHub({ id }: { id: MenuSection["id"] }) {
  const section = getSection(id);
  return (
    <main>
      <PageHeader back="/more" title={section.label} />
      <p className={styles.lead}>{section.description}</p>
      <nav className="list" aria-label={section.label}>
        {section.items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="list-row">
              <span className="list-icon">
                <Icon size={18} />
              </span>
              <span className="label">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <ChevronRight size={18} className="muted" />
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
