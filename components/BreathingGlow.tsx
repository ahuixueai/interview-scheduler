"use client";

import { motion, useReducedMotion } from "framer-motion";

/** 淡蓝色呼吸灯光效：opacity + scale 4 秒左右循环；命中 prefers-reduced-motion 时保持静态 */
export default function BreathingGlow() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      <motion.div
        className="h-80 w-80 rounded-full bg-primary/25 blur-3xl"
        initial={{ opacity: 0.55, scale: 1 }}
        animate={reducedMotion ? undefined : { opacity: [0.45, 0.9, 0.45], scale: [1, 1.15, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
