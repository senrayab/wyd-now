import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import ScheduleFormScreen from "@/features/schedule/ScheduleForm";

export const metadata: Metadata = { title: "일정 수정" };

export default function Page() {
  return (
    <ClientGate>
      <ScheduleFormScreen mode="edit" />
    </ClientGate>
  );
}
