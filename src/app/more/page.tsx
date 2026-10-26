import type { Metadata } from "next";
import { MoreHome } from "@/features/more/MoreScreens";

export const metadata: Metadata = { title: "더보기" };

export default function Page() {
  return <MoreHome />;
}
