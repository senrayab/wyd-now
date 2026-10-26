import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import ScheduleDetail from "@/features/schedule/ScheduleDetail";

export const metadata: Metadata = { title: "일정" };

export default function Page() {
  return (
    <ClientGate>
      <ScheduleDetail />
    </ClientGate>
  );
}
