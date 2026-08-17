"use client";

import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  Reorder,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;
/** 判定手势类型前允许的微小抖动（避免把点击误判为手势） */
const GESTURE_SLOP = 6;
/** 水平位移超过卡片宽度 40% 触发动作 */
const SWIPE_WIDTH_RATIO = 0.4;
/** 或速度超过 500 px/s 触发动作 */
const SWIPE_MIN_VELOCITY = 500;

interface SwipeableReorderItemProps {
  value: string;
  reducedMotion: boolean;
  gesturesDisabled: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  children: ReactNode;
}

/**
 * 手势仲裁层（第一阶段实现，本轮零改动）：
 * - 垂直拖拽 → Reorder.Item（axis="y"，排序）
 * - 水平滑动 → 独立 drag="x" 层（dragDirectionLock，改状态）
 * 指针首次移动时按「水平位移 vs 垂直位移」判定并锁定手势类型，锁定后本次手势内不允许切换；
 * 判定完成后才用原始 pointerdown 事件启动对应 dragControls，两条拖拽通道互斥、互不串扰。
 */
export default function SwipeableReorderItem({
  value,
  reducedMotion,
  gesturesDisabled,
  onSwipeLeft,
  onSwipeRight,
  children,
}: SwipeableReorderItemProps) {
  const reorderControls = useDragControls();
  const swipeControls = useDragControls();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const leftHintOpacity = useTransform(x, [-140, 0], [1, 0]);
  const rightHintOpacity = useTransform(x, [0, 140], [0, 1]);
  const rotate = useTransform(x, [-320, 320], [-4, 4]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (gesturesDisabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("button, a, input, [data-no-gesture]")) return;

    const downEvent = event.nativeEvent;
    const startX = event.clientX;
    const startY = event.clientY;
    let locked = false;

    const teardown = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };

    const onMove = (moveEvent: PointerEvent) => {
      if (locked) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) < GESTURE_SLOP) return;
      // 方向锁定：水平位移 > 垂直位移 → 滑动；否则 → 排序。锁定后不再切换。
      locked = true;
      teardown();
      if (Math.abs(dx) > Math.abs(dy)) {
        swipeControls.start(downEvent, { snapToCursor: false });
      } else {
        reorderControls.start(downEvent);
      }
    };

    const onEnd = () => {
      teardown();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };

  const handleSwipeEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const width = cardRef.current?.offsetWidth ?? 320;
    const crossedThreshold =
      Math.abs(info.offset.x) >= width * SWIPE_WIDTH_RATIO ||
      Math.abs(info.velocity.x) >= SWIPE_MIN_VELOCITY;
    if (crossedThreshold) {
      if (info.offset.x < 0) onSwipeLeft();
      else onSwipeRight();
    }
    // 无论是否触发，都用 spring 回弹/吸附归位（stiffness 300 / damping 30，不用 tween）
    animate(x, 0, reducedMotion ? { duration: 0 } : SPRING);
  };

  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={reorderControls}
      className="relative"
    >
      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        className="relative touch-none select-none"
      >
        <div className="pointer-events-none absolute inset-y-0 left-4 z-0 flex items-center">
          <motion.span
            style={{ opacity: leftHintOpacity }}
            className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent"
          >
            拿到 Offer
          </motion.span>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-4 z-0 flex items-center">
          <motion.span
            style={{ opacity: rightHintOpacity }}
            className="rounded-full bg-ink/10 px-3 py-1 text-xs font-semibold text-ink-secondary"
          >
            已挂 / 取消
          </motion.span>
        </div>
        <motion.div
          drag="x"
          dragListener={false}
          dragControls={swipeControls}
          dragDirectionLock
          onDragEnd={handleSwipeEnd}
          style={{ x, rotate }}
          className="relative z-10"
        >
          {children}
        </motion.div>
      </div>
    </Reorder.Item>
  );
}
