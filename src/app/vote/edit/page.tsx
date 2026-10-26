import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import VoteFormScreen from "@/features/vote/VoteForm";

export const metadata: Metadata = { title: "투표 사이트 수정" };

export default function Page() {
  return (
    <ClientGate>
      <VoteFormScreen mode="edit" />
    </ClientGate>
  );
}
