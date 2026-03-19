import { NextResponse } from 'next/server';
import { getDashboardData, submitSpotlight } from '@/lib/resolvetip';

export async function GET() {
  const { spotlights } = await getDashboardData();
  return NextResponse.json({ spotlights });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    program_id?: string;
    skill_id?: string;
    submitted_by?: string;
    context?: string;
    why_interesting?: string;
    usage_signal?: number;
  };

  if (!body.program_id || !body.skill_id || !body.submitted_by || !body.context || !body.why_interesting) {
    return NextResponse.json(
      { error: 'program_id, skill_id, submitted_by, context, and why_interesting are required' },
      { status: 400 },
    );
  }

  await submitSpotlight({
    programId: body.program_id,
    skillId: body.skill_id,
    submittedBy: body.submitted_by,
    context: body.context,
    whyInteresting: body.why_interesting,
    usageSignal: Number(body.usage_signal ?? 50),
  });

  return NextResponse.json({ ok: true });
}
