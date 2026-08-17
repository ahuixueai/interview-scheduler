"use client";

import type { MouseEvent, ReactNode, Ref } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface ScaleButtonProps {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
  /** 外部 ref（对话框关闭后归还焦点等场景） */
  buttonRef?: Ref<HTMLButtonElement>;
}

/** 统一按钮：点击有轻微缩放回弹（scale 0.96 → 1，spring），命中 reduced-motion 时去掉缩放动效 */
export default function ScaleButton({
  onClick,
  ariaLabel,
  children,
  className = "",
  disabled = false,
  title,
  buttonRef,
}: ScaleButtonProps) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      ref={buttonRef}
      onClick={onClick}
      whileTap={reducedMotion ? { scale: 1 } : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`inline-flex select-none items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
      {children}
    </motion.button>
  );
}
