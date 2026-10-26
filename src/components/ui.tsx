"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { getCategory } from "@/lib/categories";
import { getArtistColors } from "@/lib/palette";
import { useImageUrl } from "@/lib/hooks";
import type { Artist, CategoryId } from "@/lib/storage/types";

export function CategoryTag({ id }: { id: CategoryId }) {
  const c = getCategory(id);
  return (
    <span className="tag">
      <span className="dot" style={{ background: c.colors[0] }} />
      {c.label}
    </span>
  );
}

export function ArtistAvatar({ artist, size = 48 }: { artist: Pick<Artist, "name" | "color" | "imageId">; size?: number }) {
  const { url } = useImageUrl(artist.imageId);
  const [color] = getArtistColors(artist.color);
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: url ? undefined : color,
        fontSize: size * 0.36,
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- IndexedDB blob URL
        <img src={url} alt="" />
      ) : (
        <span aria-hidden>{artist.name.slice(0, 1)}</span>
      )}
    </span>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => onChange(!checked)}
    />
  );
}

/** 빈 상태: 앱이 보여주는 기본 문구에는 이모지 대신 선 아이콘 (이모지는 사용자가 쓴 글에만) */
export function Empty({ icon: Icon, children, action }: { icon: LucideIcon; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <Icon className="empty-icon" size={34} strokeWidth={1.5} aria-hidden />
      <div>{children}</div>
      {action}
    </div>
  );
}

/** 버튼 안에 넣는 작은 회전 원 (글자색을 따라감) */
export function Spinner({ size = 14 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden />;
}

/**
 * 화면 정보 불러오는 중: 0.3초 안에 끝나면 아무것도 안 보여주고(깜빡임 방지),
 * 더 걸리면 점 3개가 차례로 깜빡이는 표시. 보조기기에는 바로 알림.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 호출부 호환용 (예전 스켈레톤 줄 수)
export function Loading(_props: { rows?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="loading" role="status" aria-busy="true" aria-label="불러오는 중">
      {visible && (
        <span className="loading-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      )}
    </div>
  );
}
