import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { ReleaseDetailScreen } from "@/features/release/ReleaseScreens";

export const metadata: Metadata = { title: "앨범" };

export default function Page() {
  return (
    <ClientGate>
      <ReleaseDetailScreen />
    </ClientGate>
  );
}
