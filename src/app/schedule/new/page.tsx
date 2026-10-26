import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import ScheduleFormScreen from "@/features/schedule/ScheduleForm";

export const metadata: Metadata = { title: "일정 등록" };

export default function Page() {
  return (
    <ClientGate>
      <ScheduleFormScreen mode="new" />
    </ClientGate>
  );
}
