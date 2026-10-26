import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { NewsFormScreen } from "@/features/news/NewsScreens";

export const metadata: Metadata = { title: "기사 등록" };

export default function Page() {
  return (
    <ClientGate>
      <NewsFormScreen mode="new" />
    </ClientGate>
  );
}
