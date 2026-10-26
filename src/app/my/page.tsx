import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import MyScreen from "@/features/my/MyScreen";

export const metadata: Metadata = { title: "내 공간" };

export default function Page() {
  return (
    <ClientGate>
      <MyScreen />
    </ClientGate>
  );
}
