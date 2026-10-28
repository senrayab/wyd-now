import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { ArtistFocusSettings } from "@/features/more/SettingsScreens";

export const metadata: Metadata = { title: "내 아티스트" };

export default function Page() {
  return (
    <ClientGate>
      <ArtistFocusSettings />
    </ClientGate>
  );
}
