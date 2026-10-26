import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import VoteDetail from "@/features/vote/VoteDetail";

export const metadata: Metadata = { title: "투표" };

export default function Page() {
  return (
    <ClientGate>
      <VoteDetail />
    </ClientGate>
  );
}
