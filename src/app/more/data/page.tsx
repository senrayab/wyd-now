import type { Metadata } from "next";
import { MenuHub } from "@/features/more/MoreScreens";

export const metadata: Metadata = { title: "데이터" };

export default function Page() {
  return <MenuHub id="data" />;
}
