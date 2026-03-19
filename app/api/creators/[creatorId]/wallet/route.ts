import { NextResponse } from 'next/server';
import { bindCreatorWallet } from '@/lib/resolvetip';

export async function POST(
  request: Request,
  context: { params: Promise<{ creatorId: string }> },
) {
  const { creatorId } = await context.params;
  const body = (await request.json()) as { address?: string };

  if (!body.address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 });
  }

  await bindCreatorWallet({
    creatorId,
    address: body.address,
  });

  return NextResponse.json({ ok: true, creator_id: creatorId });
}
