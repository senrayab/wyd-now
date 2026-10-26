import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { NewsDetailScreen } from "@/features/news/NewsScreens";

export const metadata: Metadata = { title: "소식" };

export default function Page() {
  return (
    <ClientGate>
      <NewsDetailScreen />
    </ClientGate>
  );
}
