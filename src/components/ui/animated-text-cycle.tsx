"use client";

// Animated word cycler — measures each word's width and animates the container width
// so layout doesn't jump. Used in the hero headline to cycle through business types
// ("Etsy store / Fiverr gig / SaaS / your idea") — communicates that the guide works
// for any business shape, not just our specific stack.

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  words: string[];
  interval?: number;
  className?: string;
}

export default function AnimatedTextCycle({ words, interval = 3000, className = "" }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [width, setWidth] = useState<string>("auto");
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (measureRef.current) {
      const elements = measureRef.current.children;
      if (elements.length > currentIndex) {
        const w = elements[currentIndex].getBoundingClientRect().width;
        setWidth(`${w}px`);
      }
    }
  }, [currentIndex]);

  useEffect(() => {
    const t = setInterval(() => setCurrentIndex((i) => (i + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [interval, words.length]);

  const variants = {
    hidden: { y: -20, opacity: 0, filter: "blur(8px)" },
    visible: { y: 0, opacity: 1, filter: "blur(0px)", transition: { duration: 0.4, ease: "easeOut" } },
    exit: { y: 20, opacity: 0, filter: "blur(8px)", transition: { duration: 0.3, ease: "easeIn" } },
  };

  return (
    <>
      <div ref={measureRef} aria-hidden="true" className="absolute opacity-0 pointer-events-none" style={{ visibility: "hidden" }}>
        {words.map((w, i) => (
          <span key={i} className={className}>{w}</span>
        ))}
      </div>
      <motion.span
        className="relative inline-block align-baseline"
        animate={{ width, transition: { type: "spring", stiffness: 150, damping: 15, mass: 1.2 } }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={currentIndex}
            className={`inline-block ${className}`}
            variants={variants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ whiteSpace: "nowrap" }}
          >
            {words[currentIndex]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </>
  );
}
