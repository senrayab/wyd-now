import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { InstallScreen } from "@/features/more/SupportScreens";

export const metadata: Metadata = { title: "앱 설치 · 오프라인" };

export default function Page() {
  return (
    <ClientGate>
      <InstallScreen />
    </ClientGate>
  );
}
