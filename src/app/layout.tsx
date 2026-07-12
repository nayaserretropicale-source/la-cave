import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import AvatarBadge from "@/components/AvatarBadge";
import AgeGate from "@/components/AgeGate";
import PushSetup from "@/components/PushSetup";
import ScrollReveal from "@/components/ScrollReveal";
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
      <body className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased min-h-full flex flex-col pb-28`}>
        <ConfirmProvider>
          <AgeGate />
          <AvatarBadge />
          <PushSetup />
          <ScrollReveal />
          {/* Filtre de réfraction "liquid glass" (Chrome/Android ; ignoré par iOS Safari) */}
          <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
            <defs>
              <filter id="liquid-glass" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.011 0.014" numOctaves={2} seed={7} result="n">
                  <animate
                    attributeName="baseFrequency"
                    dur="8s"
                    values="0.011 0.014;0.018 0.010;0.011 0.014"
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feGaussianBlur in="n" stdDeviation={1.2} result="nb" />
                <feDisplacementMap in="SourceGraphic" in2="nb" scale={40} xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
          </svg>
          {children}
          <NavBar />
        </ConfirmProvider>
      </body>
    </html>
  );
}