import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { ResetScreen } from "@/features/more/DataScreens";

export const metadata: Metadata = { title: "샘플 · 초기화" };

export default function Page() {
  return (
    <ClientGate>
      <ResetScreen />
    </ClientGate>
  );
}
