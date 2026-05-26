import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trevs Agents — Build Your Own AI Agent Operation",
  description:
    "The guide that gives you a proven model and the agent stack to run it — for any business, even one you haven't started yet.",
  openGraph: {
    title: "Trevs Agents — Build Your Own AI Agent Operation",
    description: "The guide that gives you a proven model and the agent stack to run it — for any business, even one you haven't started yet.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="relative z-0 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
