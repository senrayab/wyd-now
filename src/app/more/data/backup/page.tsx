import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { BackupScreen } from "@/features/more/DataScreens";

export const metadata: Metadata = { title: "백업 · 복원" };

export default function Page() {
  return (
    <ClientGate>
      <BackupScreen />
    </ClientGate>
  );
}
