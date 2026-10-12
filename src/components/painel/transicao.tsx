"use client";

import type { ReactNode } from "react";
import { MotionConfig, motion } from "motion/react";

/** Entrada suave de cada página (respeita prefers-reduced-motion). */
export function TransicaoPagina({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </motion.div>
    </MotionConfig>
  );
}
