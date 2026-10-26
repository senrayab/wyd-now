import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { StorageScreen } from "@/features/more/DataScreens";

export const metadata: Metadata = { title: "저장 공간" };

export default function Page() {
  return (
    <ClientGate>
      <StorageScreen />
    </ClientGate>
  );
}
