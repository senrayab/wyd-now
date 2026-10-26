import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { NewsFormScreen } from "@/features/news/NewsScreens";

export const metadata: Metadata = { title: "기사 수정" };

export default function Page() {
  return (
    <ClientGate>
      <NewsFormScreen mode="edit" />
    </ClientGate>
  );
}
