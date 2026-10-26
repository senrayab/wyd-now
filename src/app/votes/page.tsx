import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import VotesScreen from "@/features/vote/VotesScreen";

export const metadata: Metadata = { title: "투표" };

export default function Page() {
  return (
    <ClientGate>
      <VotesScreen />
    </ClientGate>
  );
}
