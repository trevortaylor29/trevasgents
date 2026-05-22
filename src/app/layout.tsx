import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trevs Agents — Build Your Own AI Agent Operation",
  description:
    "Solo founders running autonomous AI agent ecosystems. Build guides, daily Maverick experiment, community for indie builders. Free to join.",
  openGraph: {
    title: "Trevs Agents — Build Your Own AI Agent Operation",
    description: "Solo founders running autonomous AI agent ecosystems.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative z-0">{children}</body>
    </html>
  );
}
