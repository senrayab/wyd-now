import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import ArtistDetail from "@/features/artist/ArtistDetail";

export const metadata: Metadata = { title: "아티스트" };

export default function Page() {
  return (
    <ClientGate>
      <ArtistDetail />
    </ClientGate>
  );
}
