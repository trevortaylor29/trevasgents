import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Builder — Trevs Agents",
  description:
    "Build your own AI agent crew. Pick a proven agent, configure it, and your Claude Code installs it — fueled and ready.",
};

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
