"use client";

import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { downloadPNG, ImageError, sharePNG } from "@/lib/image/image-service";
import type { StoredImage } from "@/lib/storage/types";
import { useFeedback } from "./Feedback";
import { Spinner } from "./ui";

/** 저장된 WebP 이미지를 PNG 로 내려받기 / 공유 */
export default function ImageActions({ image, title }: { image: StoredImage; title?: string }) {
  const { toast } = useFeedback();
  const [busy, setBusy] = useState<"download" | "share" | null>(null);

  async function run(kind: "download" | "share") {
    setBusy(kind);
    try {
      if (kind === "download") {
        await downloadPNG(image);
        toast("PNG 파일로 저장했어요.");
      } else {
        const result = await sharePNG(image, title);
        if (result === "downloaded") toast("공유를 지원하지 않아 PNG로 저장했어요.");
      }
    } catch (e) {
      toast(e instanceof ImageError ? e.message : "PNG로 변환하지 못했어요.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="row">
      <button type="button" className="btn btn-soft btn-sm" disabled={!!busy} onClick={() => run("download")}>
        {busy === "download" ? <Spinner /> : <Download size={15} />} {busy === "download" ? "PNG로 변환 중" : "PNG 저장"}
      </button>
      <button type="button" className="btn btn-soft btn-sm" disabled={!!busy} onClick={() => run("share")}>
        {busy === "share" ? <Spinner /> : <Share2 size={15} />} {busy === "share" ? "공유 준비 중" : "PNG 공유"}
      </button>
    </div>
  );
}
