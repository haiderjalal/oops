import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { getSiteConfig } from "@/lib/config";

import "@/styles/globals.css";

// Fonts are self-hosted from npm packages (@fontsource-variable/*): no request to Google at build
// or run time, so builds work offline and visitors never leak requests to a third party.
// Fraunces ships its weight + SOFT axes (62 kB); DM Sans its weight axis (37 kB).
const fraunces = localFont({
  src: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-soft-normal.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
  fallback: ["Iowan Old Style", "Georgia", "serif"],
});

const dmSans = localFont({
  src: "../../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

const TAGLINE = "Collecting memories, wrong turns, and questionable travel decisions.";

const site = getSiteConfig();

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Oops, I Traveled Again! — a travel atlas & photo journal",
    template: "%s · Oops, I Traveled Again!",
  },
  description: `${TAGLINE} An interactive globe of places, stories and photos.`,
  applicationName: "Oops, I Traveled Again!",
  openGraph: {
    type: "website",
    siteName: "Oops, I Traveled Again!",
    title: "Oops, I Traveled Again!",
    description: TAGLINE,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oops, I Traveled Again!",
    description: TAGLINE,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f8f4eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only z-[100] rounded-full bg-ink px-5 py-3 font-semibold text-parchment focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
