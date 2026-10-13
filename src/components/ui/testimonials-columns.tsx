"use client";

// Animated vertical-scroll testimonial column (adapted from 21st.dev, re-themed to
// the Trevs Agents brand: dark cards, violet/cyan accents, initials avatars instead
// of stock photos — honest, since these are real Discord members). Uses the site's
// existing framer-motion (not the separate `motion` package).

import React from "react";
import { motion } from "framer-motion";

export type Vouch = { text: string; name: string; role: string };

function InitialsAvatar({ name }: { name: string }) {
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  const initials = clean.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-black"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 75% 74%), hsl(${(hue + 45) % 360} 78% 68%))` }}
    >
      {initials}
    </div>
  );
}

export function TestimonialsColumn(props: { className?: string; testimonials: Vouch[]; duration?: number }) {
  return (
    <div className={props.className}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{ duration: props.duration || 10, repeat: Infinity, ease: "linear", repeatType: "loop" }}
        // transform-gpu + will-change keep this on the compositor; NO backdrop-blur
        // (blur behind moving content forces a repaint every frame → the jank).
        className="flex transform-gpu flex-col gap-5 pb-5 [will-change:transform]"
      >
        {[0, 1].map((dup) => (
          <React.Fragment key={dup}>
            {props.testimonials.map(({ text, name, role }, i) => (
              <div
                key={i}
                className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#0d0e17] p-6"
              >
                <p className="text-[13.5px] leading-relaxed text-white/85">&ldquo;{text}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <InitialsAvatar name={name} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold tracking-tight text-white">{name}</div>
                    <div className="truncate text-[11.5px] leading-4 text-white/45">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}
