import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import ArtistsScreen from "@/features/artist/ArtistsScreen";

export const metadata: Metadata = { title: "아티스트" };

export default function Page() {
  return (
    <ClientGate>
      <ArtistsScreen />
    </ClientGate>
  );
}
