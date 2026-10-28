import type { Metadata } from "next";
import ClientGate from "@/components/ClientGate";
import { ReleaseFormScreen } from "@/features/release/ReleaseScreens";

export const metadata: Metadata = { title: "앨범 수정" };

export default function Page() {
  return (
    <ClientGate>
      <ReleaseFormScreen mode="edit" />
    </ClientGate>
  );
}
