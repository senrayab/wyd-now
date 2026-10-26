import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import SearchScreen from "@/features/search/SearchScreen";

export const metadata: Metadata = { title: "검색" };

export default function Page() {
  return (
    <ClientGate>
      <SearchScreen />
    </ClientGate>
  );
}
