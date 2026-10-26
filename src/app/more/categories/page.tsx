import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import CategoriesGuide from "@/features/more/CategoriesGuide";

export const metadata: Metadata = { title: "카테고리 가이드" };

export default function Page() {
  return (
    <ClientGate>
      <CategoriesGuide />
    </ClientGate>
  );
}
