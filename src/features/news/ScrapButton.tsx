"use client";

import { Bookmark } from "lucide-react";
import { useFeedback } from "@/components/Feedback";
import { useStoreQuery } from "@/lib/hooks";
import { getDataStore } from "@/lib/storage";
import styles from "./News.module.css";

/** 기사 스크랩 토글 — 내 공간(/my)에 모임. 이 기기에만 저장 */
export default function ScrapButton({ newsId, title, variant = "plain" }: { newsId: string; title: string; variant?: "plain" | "round" }) {
  const { toast } = useFeedback();
  const { data } = useStoreQuery((s) => s.scraps.list(), "scraps");
  const saved = !!data?.some((s) => s.newsId === newsId);

  async function toggle() {
    const { scraps } = getDataStore();
    if (saved) {
      await scraps.remove(newsId);
      toast("스크랩을 해제했어요.");
    } else {
      await scraps.add(newsId);
      toast("내 공간에 스크랩했어요.");
    }
  }

  return (
    <button
      type="button"
      className={variant === "round" ? "icon-btn" : styles.scrap}
      aria-pressed={saved}
      aria-label={saved ? `${title} 스크랩 해제` : `${title} 스크랩`}
      onClick={toggle}
    >
      <Bookmark size={variant === "round" ? 18 : 17} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
