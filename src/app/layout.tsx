import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import LayerSwitcher from "@/components/navigation/LayerSwitcher";
import PwaRegister from "@/components/pwa/PwaRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FLOW OS",
  description: "自分を知り、学び、Questで一歩進むためのFLOW OS",
  applicationName: "FLOW OS Quest",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FLOW Quest",
  },
  icons: {
    icon: "/icon-192.svg",
    apple: "/icon-192.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090a08",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        <LayerSwitcher />
        {children}
      </body>
    </html>
  );
}
