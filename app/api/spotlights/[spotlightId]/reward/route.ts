import { NextResponse } from 'next/server';
import { rewardSpotlight } from '@/lib/resolvetip';

export async function POST(
  _request: Request,
  context: { params: Promise<{ spotlightId: string }> },
) {
  const { spotlightId } = await context.params;

  try {
    const result = await rewardSpotlight({ spotlightId });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not reward spotlight.' },
      { status: 400 },
    );
  }
}
