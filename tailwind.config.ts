import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
        pixel: ["'Press Start 2P'", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(34, 211, 238, 0.3)",
        "glow-violet": "0 0 24px rgba(167, 139, 250, 0.4)",
        "glow-pink": "0 0 24px rgba(244, 114, 182, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
