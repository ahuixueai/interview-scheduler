import { NextResponse } from 'next/server';
import { createPuzzleChallenge } from '@/lib/puzzle';

/** POST /api/verification/puzzle：生成拼图谜题（签名 token + 背景图），2 分钟有效 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(createPuzzleChallenge());
}
