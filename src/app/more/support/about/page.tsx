import type { Metadata } from "next";
import { AboutScreen } from "@/features/more/SupportScreens";
import pkg from "../../../../../package.json";

export const metadata: Metadata = { title: "앱 정보" };

export default function Page() {
  return <AboutScreen version={pkg.version} />;
}
