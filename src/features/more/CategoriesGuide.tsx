"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { CATEGORIES } from "@/lib/categories";
import { useStoreQuery } from "@/lib/hooks";
import styles from "./Guide.module.css";

export default function CategoriesGuide() {
  const { data } = useStoreQuery((s) => s.schedules.list(), "all-schedules");
  const count = (id: string) => data?.filter((s) => s.category === id).length ?? 0;

  return (
    <main>
      <PageHeader back="/more/explore" title="카테고리 가이드" />
      <p className={styles.lead}>일정은 8가지 카테고리로 나뉘고, 캘린더 점과 카드 색으로 구분돼요. 누르면 해당 카테고리 일정만 모아 볼 수 있어요.</p>
      <div className={styles.categoryGrid}>
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.id} href={`/calendar?view=list&cat=${c.id}`} className={`card ${styles.category}`}>
              <Icon className={styles.icon} size={28} strokeWidth={1.7} style={{ color: c.colors[0] }} aria-hidden />
              <strong>{c.label}</strong>
              <small>{c.description}</small>
              <span className={styles.count}>
                <span className="num">{count(c.id)}</span>개 일정 <ChevronRight size={14} />
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
