import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import FeedScreen from "@/features/feed/FeedScreen";

export const metadata: Metadata = { title: "RIIZE NEWS" };

export default function Page() {
  return (
    <ClientGate>
      <FeedScreen />
    </ClientGate>
  );
}
