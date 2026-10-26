import type { Metadata } from "next";
import { MenuHub } from "@/features/more/MoreScreens";

export const metadata: Metadata = { title: "설정" };

export default function Page() {
  return <MenuHub id="settings" />;
}
