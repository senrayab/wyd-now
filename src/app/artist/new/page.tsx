import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import ArtistFormScreen from "@/features/artist/ArtistForm";

export const metadata: Metadata = { title: "아티스트 등록" };

export default function Page() {
  return (
    <ClientGate>
      <ArtistFormScreen mode="new" />
    </ClientGate>
  );
}
