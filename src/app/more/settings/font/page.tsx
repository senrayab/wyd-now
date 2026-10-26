import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { FontSettings } from "@/features/more/SettingsScreens";

export const metadata: Metadata = { title: "글꼴" };

export default function Page() {
  return (
    <ClientGate>
      <FontSettings />
    </ClientGate>
  );
}
