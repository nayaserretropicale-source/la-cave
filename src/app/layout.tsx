import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import AvatarBadge from "@/components/AvatarBadge";
import AgeGate from "@/components/AgeGate";
import PushSetup from "@/components/PushSetup";
import { ConfirmProvider } from "@/components/Confirm";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: "La Cave",
  description: "Ma cave à cigares personnelle",
  appleWebApp: { capable: true, statusBarStyle: "black", title: "La Cave" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased min-h-full flex flex-col pb-20`}>
        <ConfirmProvider>
          <AgeGate />
          <AvatarBadge />
          <PushSetup />
          {children}
          <NavBar />
        </ConfirmProvider>
      </body>
    </html>
  );
}