import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hub — Trevs Agents",
  description: "Where your agents report in. Every run, every number, every error, in one place, with a DM when one goes quiet.",
};

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return children;
}
