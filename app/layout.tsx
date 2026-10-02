import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Pareto — WebDev model frontier", template: "%s · Pareto" },
  description:
    "Interactive price–performance Pareto frontier of Code Arena WebDev leaderboards, synced automatically from arena.ai.",
};

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
