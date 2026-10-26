import type { Metadata } from "next";
import { HelpScreen } from "@/features/more/SupportScreens";

export const metadata: Metadata = { title: "도움말" };

export default function Page() {
  return <HelpScreen />;
}
