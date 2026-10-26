import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { NewsListScreen } from "@/features/news/NewsScreens";

export const metadata: Metadata = { title: "아티스트 소식" };

export default function Page() {
  return (
    <ClientGate>
      <NewsListScreen />
    </ClientGate>
  );
}
