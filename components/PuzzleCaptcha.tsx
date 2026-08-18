"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PUZZLE_TOLERANCE_PX } from "@/lib/puzzle-constants";
import ScaleButton from "./ScaleButton";

const W = 320;
const H = 160;
const PIECE = 46;
const PIECE_Y = 57;
const START_X = 16;
const MAX_RETRY = 3;

interface PuzzlePayload {
  x: number;
  exp: number;
  img: string;
}

/** 从签名 token 中解出谜题参数（客户端只用于 UI 判定，真正的校验在服务端） */
function decodePayload(token: string): PuzzlePayload | null {
  try {
    const body = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const padded = body + "=".repeat((4 - (body.length % 4)) % 4);
    return JSON.parse(atob(padded)) as PuzzlePayload;
  } catch {
    return null;
  }
}

interface PuzzleCaptchaProps {
  token: string;
  imageUrl: string;
  onSuccess: (token: string, offset: number) => void;
  onRefresh: () => void;
}

/** 拼图滑块人机验证：拖动滑块对齐缺口，误差 <= 5px 通过；3 次失败自动换图 */
export default function PuzzleCaptcha({ token, imageUrl, onSuccess, onRefresh }: PuzzleCaptchaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; pieceX: number } | null>(null);
  const payload = decodePayload(token);
  const answer = payload?.x ?? 0;
  const [pieceX, setPieceX] = useState(START_X);
  const [status, setStatus] = useState<"idle" | "dragging" | "success" | "fail">("idle");
  const [fails, setFails] = useState(0);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      draw();
    };
    img.src = imageUrl;
    return () => {
      img.onload = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  const roundedRect = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    const gapX = START_X + answer;
    // 缺口：暗化 + 内描边
    roundedRect(ctx, gapX, PIECE_Y, PIECE, PIECE, 6);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 滑块：把缺口处的内容裁出来画在当前位置
    ctx.save();
    roundedRect(ctx, pieceX, PIECE_Y, PIECE, PIECE, 6);
    ctx.clip();
    ctx.drawImage(img, pieceX - gapX, 0, W, H);
    ctx.restore();
    roundedRect(ctx, pieceX, PIECE_Y, PIECE, PIECE, 6);
    ctx.strokeStyle = status === "success" ? "#22c55e" : status === "fail" ? "#ef4444" : "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [answer, pieceX, status, roundedRect]);

  useEffect(() => {
    draw();
  }, [draw]);

  const commit = useCallback(() => {
    const offset = pieceX - START_X;
    if (Math.abs(offset - answer) <= PUZZLE_TOLERANCE_PX) {
      setStatus("success");
      window.setTimeout(() => onSuccess(token, offset), 450);
      return;
    }
    setStatus("fail");
    const next = fails + 1;
    setFails(next);
    if (next >= MAX_RETRY) {
      window.setTimeout(() => {
        setPieceX(START_X);
        setStatus("idle");
        setFails(0);
        onRefresh();
      }, 500);
    } else {
      // 滑块回位，但失败提示保留到下一次拖动（用户能看到原因）
      window.setTimeout(() => {
        setPieceX(START_X);
      }, 450);
    }
  }, [answer, fails, onRefresh, onSuccess, pieceX, token]);

  const pointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (status === "success") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < pieceX - 8 || x > pieceX + PIECE + 8) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: x, pieceX };
    setStatus("dragging");
  };

  const pointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - rect.left - drag.startX;
    setPieceX(Math.min(W - PIECE, Math.max(0, drag.pieceX + dx)));
  };

  const pointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    commit();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === "ArrowRight") setPieceX((x) => Math.min(W - PIECE, x + 4));
    else if (e.key === "ArrowLeft") setPieceX((x) => Math.max(0, x - 4));
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        role="slider"
        tabIndex={0}
        aria-label="拼图滑块：按住滑块拖到缺口位置"
        aria-valuemin={0}
        aria-valuemax={W - PIECE - START_X}
        aria-valuenow={Math.max(0, pieceX - START_X)}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onKeyDown={onKeyDown}
        className="h-auto w-full max-w-[320px] cursor-grab touch-none select-none rounded-lg active:cursor-grabbing"
      />
      <p className="text-xs text-ink-tertiary" role="status">
        {status === "success"
          ? "验证通过 ✓"
          : status === "fail"
            ? `位置不对，请重试（还可尝试 ${MAX_RETRY - fails} 次）`
            : "按住滑块，拖到缺口位置（误差 5px 内）"}
      </p>
      <ScaleButton
        onClick={onRefresh}
        ariaLabel="换一张拼图"
        className="bg-transparent p-1 text-xs text-ink-tertiary hover:bg-ink/5"
      >
        <RefreshCw size={12} aria-hidden />
        换一张
      </ScaleButton>
    </div>
  );
}
