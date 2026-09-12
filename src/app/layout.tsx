import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oretha AI",
  description:
    "Uncensored Black-powered AI for your work, art, and hustle. Agents, KEVO virtual office, workflows, and media lab — in your pocket.",
  applicationName: "Oretha AI",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Oretha",
  },
  icons: { icon: "/oretha-logo.jpg", apple: "/oretha-logo.jpg" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
