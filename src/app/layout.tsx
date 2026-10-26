import type { Metadata, Viewport } from "next";
import { Lato, Poppins } from "next/font/google";
import AppShell from "@/components/AppShell";
import { PREFS_SCRIPT } from "@/lib/prefs";
import "@/styles/fonts.css";
import "./globals.css";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: { default: "wyd now", template: "%s · wyd now" },
  description: "아티스트의 공연·방송·콘텐츠 일정을 한눈에 확인하는 스케줄 앱",
  applicationName: "wyd now",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "wyd now", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efedf8" },
    { media: "(prefers-color-scheme: dark)", color: "#14122a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      data-font-ko="pretendard"
      data-font-en="poppins"
      className={`${lato.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
