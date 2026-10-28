import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { NewsListScreen } from "@/features/news/NewsScreens";

export const metadata: Metadata = { title: "기사 모음" };

export default function Page() {
  return (
    <ClientGate>
      <NewsListScreen />
    </ClientGate>
  );
}
