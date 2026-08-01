import type { Metadata } from "next";
import { Alegreya_Sans_SC, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
  title: "Mythical Mecca — the Adventurers' Guild",
  description:
    "A homebase for the geek collective. Gather, quest, and find your people.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
