import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Archivo, Figtree, Syne } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

// Display font for headings and team names. Archivo is a variable font; the
// wdth axis lets `.font-display` render it Expanded (font-stretch: 125%) for
// the wide, sporty look — with full-depth descenders, unlike Syne (below).
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

// Syne's g/y/p descenders are flat-cut and extremely shallow *by design*,
// which reads as clipped text on user-generated content. Keep it only for the
// fixed wordmark "Kanchazo", which has no descenders (see .font-logo).
const syne = Syne({
  subsets: ["latin"],
  weight: "800",
  variable: "--font-syne",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kanchazo",
  description: "Youth sports team manager — schedule, roster, and chat for your team.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kanchazo",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0369a1",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`h-full ${archivo.variable} ${syne.variable} ${figtree.variable}`}>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
      </head>
      <body className="min-h-full antialiased bg-mk-bg text-mk-text font-body">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
