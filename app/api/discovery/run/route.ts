import { NextResponse } from 'next/server';
import { runDiscoveryAgent } from '@/lib/resolvetip';

export async function POST(request: Request) {
  const body = (await request.json()) as { program_id?: string };

  if (!body.program_id) {
    return NextResponse.json({ error: 'program_id is required' }, { status: 400 });
  }

  try {
    const result = await runDiscoveryAgent({ programId: body.program_id });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not run discovery agent.' },
      { status: 400 },
    );
  }
}
