import type { Metadata } from "next";
import { LicensesScreen } from "@/features/more/SupportScreens";

export const metadata: Metadata = { title: "오픈소스 라이선스" };

export default function Page() {
  return <LicensesScreen />;
}
