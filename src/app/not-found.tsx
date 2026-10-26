"use client";

import { Compass } from "lucide-react";
import Link from "next/link";
import { Empty } from "@/components/ui";

export default function NotFound() {
  return (
    <main style={{ paddingTop: 96 }}>
      <Empty icon={Compass} action={<Link href="/" className="btn btn-primary btn-sm">홈으로</Link>}>
        페이지를 찾을 수 없어요.
      </Empty>
    </main>
  );
}
