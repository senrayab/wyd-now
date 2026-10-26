import type { Metadata } from "next";
import { PrivacyScreen } from "@/features/more/SupportScreens";

export const metadata: Metadata = { title: "개인정보 안내" };

export default function Page() {
  return <PrivacyScreen />;
}
