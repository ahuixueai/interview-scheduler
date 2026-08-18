import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getAuthSecret } from "./secret";

import { PUZZLE_TOLERANCE_PX } from "./puzzle-constants";
export { PUZZLE_TOLERANCE_PX } from "./puzzle-constants";

/** 拼图谜题有效期 */
export const PUZZLE_TTL_MS = 2 * 60_000;

const PUZZLE_IMAGES = ["puzzle-1.jpg", "puzzle-2.jpg", "puzzle-3.jpg", "puzzle-4.jpg"];

interface PuzzlePayload {
  /** 正确拖动距离（像素，内部坐标系 320×160） */
  x: number;
  /** 过期时间戳（ms） */
  exp: number;
  img: string;
}

function signBody(body: string): string {
  return createHmac("sha256", getAuthSecret()).update(body).digest("base64url");
}

/** 生成一个新谜题：随机图片 + 随机缺口位置，返回签名 token 与图片 URL */
export function createPuzzleChallenge(): { token: string; imageUrl: string } {
  const img = PUZZLE_IMAGES[randomInt(0, PUZZLE_IMAGES.length)];
  const payload: PuzzlePayload = { x: randomInt(80, 170), exp: Date.now() + PUZZLE_TTL_MS, img };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return { token: body + "." + signBody(body), imageUrl: "/puzzles/" + img };
}

export interface PuzzleCheck {
  ok: boolean;
  error?: string;
}

const fail = (error: string): PuzzleCheck => ({ ok: false, error });

/** 校验拼图结果：签名、有效期、拖动误差（偏移不超过 5px 才算通过） */
export function verifyPuzzle(token: string, offset: number): PuzzleCheck {
  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) return fail("验证已失效，请重试");
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = signBody(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return fail("验证已失效，请重试");

  let payload: PuzzlePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PuzzlePayload;
  } catch {
    return fail("验证已失效，请重试");
  }
  if (!Number.isFinite(payload.x) || !Number.isFinite(payload.exp)) return fail("验证已失效，请重试");
  if (Date.now() > payload.exp) return fail("验证已过期，请重试");
  if (!Number.isFinite(offset) || Math.abs(offset - payload.x) > PUZZLE_TOLERANCE_PX) {
    return fail("拼图位置不对，请重试");
  }
  return { ok: true };
}
