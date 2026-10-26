import type { Metadata } from "next";
import { MenuHub } from "@/features/more/MoreScreens";

export const metadata: Metadata = { title: "지원" };

export default function Page() {
  return <MenuHub id="support" />;
}
