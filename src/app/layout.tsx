import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Archivo, Archivo_Narrow } from "next/font/google";

import { AppShell } from "@/components/shell/app-shell";

import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const archivoNarrow = Archivo_Narrow({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-archivo-narrow",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BodyPlan",
    template: "%s · BodyPlan",
  },
  description:
    "Personal 18+ gym planner. Type an InBody / Tanita printout. No photos. No account.",
  applicationName: "BodyPlan",
};

export const viewport: Viewport = {
  themeColor: "#d4d0c6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} ${archivoNarrow.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
