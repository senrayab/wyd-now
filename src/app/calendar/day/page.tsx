import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import DayScreen from "@/features/calendar/DayScreen";

export const metadata: Metadata = { title: "하루 타임라인" };

export default function Page() {
  return (
    <ClientGate>
      <DayScreen />
    </ClientGate>
  );
}
