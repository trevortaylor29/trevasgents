"use client";

// Proof section for the Trevs Agents landing page. Two kinds of proof:
//  1. A masonry wall of real Discord screenshots ("receipts") — the strongest proof.
//  2. Animated scrolling columns of real member vouches (text).
// All copy is lightly trimmed from real members' own words. Screenshots live in
// /public/vouches. Sits above the pricing so belief is built before the ask.

import { motion } from "framer-motion";
import { TestimonialsColumn, type Vouch } from "@/components/ui/testimonials-columns";

const VOUCHES: Vouch[] = [
  { text: "Trev's guide was easy to walk through, and combined with Claude everything just clicked. I was up and running within a night — I wouldn't have even gotten started without his springboard instructions.", name: "RyanDamask", role: "Running in one night" },
  { text: "Before this I had absolutely zero developing experience. I just created my first agent plugged into my rented server and I'm absolutely mind blown.", name: "TommyT22", role: "First agent, zero experience" },
  { text: "24 hours in. Best $30 I've ever spent.", name: "REMORI", role: "24 hours in" },

  { text: "Seemed intimidating at first glance, but I'm shocked how easy it is to follow once you get going. I had genuinely zero background just hours ago.", name: "marsans", role: "Started hours ago" },
  { text: "My AI now fully runs my faceless YouTube channel — 45 videos, 4K views, 25 subs, all automatic. Only 2 days of work.", name: "Sombra", role: "Faceless YouTube on autopilot" },
  { text: "Manager agent working exactly as intended thanks to the guide. 🔥", name: "RealVIPCody", role: "Manager agent live" },

  { text: "Glad I stumbled onto Trev's TikToks and got in here. The agentic loop is going to be commonplace in no time.", name: "Wes Maestro", role: "Building his Etsy shop" },
  { text: "Built an automatic job-application tool. 😭 ✌🏿", name: "FrateTrain", role: "Built a job-apply tool" },
  { text: "So far it's been hella helpful. Can't wait to see what's coming down the road.", name: "OneEyedGamer", role: "Early member" },
];

const col1 = VOUCHES.slice(0, 3);
const col2 = VOUCHES.slice(3, 6);
const col3 = VOUCHES.slice(6, 9);

// Curated to the strongest, cleanest screenshots (dropped the empty-channel + off-topic ones).
const SHOTS = [1, 3, 5, 7, 2];

export function Testimonials() {
  return (
    <section className="relative mb-20">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        viewport={{ once: true }}
        className="mx-auto flex max-w-[560px] flex-col items-center text-center"
      >
        <div className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-1 font-mono text-[10px] uppercase tracking-[0.28em] text-violet-300/80">
          Testimonials
        </div>
        <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
          Real members. <span className="animate-gradient-text">Real builds.</span>
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/55">
          3,000+ builders inside — most starting from zero. Here&apos;s what they&apos;re saying and shipping.
        </p>
      </motion.div>

      {/* animated vouch columns (top-and-bottom fade so there's no hard cutoff) */}
      <div className="mt-10 flex justify-center gap-5 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)] max-h-[520px]">
        <TestimonialsColumn testimonials={col1} duration={22} />
        <TestimonialsColumn testimonials={col2} duration={28} className="hidden md:block" />
        <TestimonialsColumn testimonials={col3} duration={25} className="hidden lg:block" />
      </div>

      {/* real screenshots below the wall — curated, in a tidy masonry */}
      <div className="mx-auto mt-14 max-w-3xl text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">Straight from the Discord</div>
      </div>
      <div className="mx-auto mt-6 max-w-4xl columns-1 gap-4 sm:columns-2 [&>figure]:mb-4">
        {SHOTS.map((n) => (
          <motion.figure
            key={n}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, margin: "-40px" }}
            className="break-inside-avoid overflow-hidden rounded-xl border border-white/10"
          >
            {/* eager (default, not lazy): these small shots load up-front so they don't
              shift layout mid-scroll — otherwise the "jump to pricing" whoosh lands short. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/vouches/vouch${n}.jpg`} alt="Real member result from the Trevs Agents Discord" className="block w-full" />
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
