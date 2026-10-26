"use client";

import { Plus, X } from "lucide-react";
import type { LinkItem } from "@/lib/storage/types";

interface Props {
  label: string;
  links: LinkItem[];
  onChange: (links: LinkItem[]) => void;
  error?: string;
  placeholder?: string;
}

export default function LinksEditor({ label, links, onChange, error, placeholder = "예: 티켓 예매" }: Props) {
  const update = (i: number, patch: Partial<LinkItem>) =>
    onChange(links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {links.map((link, i) => (
        <div key={i} className="input-row">
          <input
            className="input"
            style={{ flex: "0 0 34%" }}
            placeholder={placeholder}
            aria-label={`${label} ${i + 1} 이름`}
            value={link.label}
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <input
            className="input"
            style={{ flex: 1 }}
            type="url"
            inputMode="url"
            placeholder="https://"
            aria-label={`${label} ${i + 1} 주소`}
            value={link.url}
            onChange={(e) => update(i, { url: e.target.value })}
          />
          <button
            type="button"
            className="icon-btn sm"
            style={{ alignSelf: "center" }}
            aria-label={`${label} ${i + 1} 삭제`}
            onClick={() => onChange(links.filter((_, idx) => idx !== i))}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...links, { label: "", url: "" }])}>
        <Plus size={15} /> 링크 추가
      </button>
      {error && <span className="error">{error}</span>}
    </div>
  );
}
