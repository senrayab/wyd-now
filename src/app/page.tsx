import ClientGate from "@/components/ClientGate";
import HomeScreen from "@/features/home/HomeScreen";

export default function Page() {
  return (
    <ClientGate>
      <HomeScreen />
    </ClientGate>
  );
}
