import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { CalendarSettings } from "@/features/more/SettingsScreens";

export const metadata: Metadata = { title: "캘린더 설정" };

export default function Page() {
  return (
    <ClientGate>
      <CalendarSettings />
    </ClientGate>
  );
}
