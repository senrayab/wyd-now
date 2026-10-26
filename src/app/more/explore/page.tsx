import type { Metadata } from "next";
import { MenuHub } from "@/features/more/MoreScreens";

export const metadata: Metadata = { title: "둘러보기" };

export default function Page() {
  return <MenuHub id="explore" />;
}
