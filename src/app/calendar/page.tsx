import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import CalendarScreen from "@/features/calendar/CalendarScreen";

export const metadata: Metadata = { title: "캘린더" };

export default function Page() {
  return (
    <ClientGate>
      <CalendarScreen />
    </ClientGate>
  );
}
