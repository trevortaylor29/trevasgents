"use client";
// Hand-delivered sign-in (2026-10-14). When login email cannot be sent, we DM a link to THIS page instead of the raw
// Supabase verify URL: the verify URL is one-use and a chat app's link preview can consume it before the person clicks.
// This page does nothing on load; the button navigates to the real verify URL, which no crawler will do.
import { useEffect, useState } from "react";

export default function SignIn() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    try {
      const u = new URLSearchParams(window.location.search).get("u") || "";
      const decoded = atob(u.replace(/-/g, "+").replace(/_/g, "/"));
      if (/^https:\/\/[a-z0-9]+\.supabase\.co\/auth\/v1\/verify\?/.test(decoded)) setUrl(decoded);
    } catch { /* bad link */ }
  }, []);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-3 text-2xl font-semibold text-white">Sign in to the Agent Builder</h1>
      {url ? (
        <>
          <p className="mb-6 text-sm text-white/70">This link signs you in once. Press the button and you will land in the builder.</p>
          <button type="button" onClick={() => { window.location.href = url; }} className="rounded-lg border border-violet-300/60 bg-violet-400/20 px-6 py-3 font-semibold text-violet-100 hover:bg-violet-400/40">Sign me in</button>
        </>
      ) : (
        <p className="text-sm text-white/70">This sign-in link is incomplete. Ask Trevor for a fresh one.</p>
      )}
    </main>
  );
}
