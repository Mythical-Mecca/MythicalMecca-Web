import type { Metadata, Viewport } from "next";
import { Alegreya_Sans_SC, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Display: a small-caps humanist SANS — keeps the carved-inscription fantasy
// character Cinzel gave us, but far more readable at every size.
const display = Alegreya_Sans_SC({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

// Body/secondary: neutral, highly readable workhorse sans.
const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // A template, so every page declares only its own name and the suffix stays
  // consistent. 25 of the 34 routes used to inherit this default verbatim, so
  // the browser tab, the history entry and any bookmark all read "Mythical
  // Mecca — the Adventurers' Guild" no matter where you were.
  title: {
    default: "Mythical Mecca — the Adventurers' Guild",
    template: "%s — Mythical Mecca",
  },
  description:
    "A homebase for the geek community. Gather, quest, and find your people.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased overflow-x-hidden max-w-full`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden max-w-full">{children}</body>
    </html>
  );
}
