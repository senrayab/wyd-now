import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { ThemeSettings } from "@/features/more/SettingsScreens";

export const metadata: Metadata = { title: "화면 테마" };

export default function Page() {
  return (
    <ClientGate>
      <ThemeSettings />
    </ClientGate>
  );
}
