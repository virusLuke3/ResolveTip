import { NextResponse } from 'next/server';
import { getDashboardData, registerSkill } from '@/lib/resolvetip';

export async function GET() {
  const { skills } = await getDashboardData();
  return NextResponse.json({ skills });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    creator_id?: string;
    name?: string;
    tagline?: string;
    description?: string;
    category?: string;
    repo_url?: string;
  };

  if (!body.creator_id || !body.name || !body.tagline || !body.description || !body.category || !body.repo_url) {
    return NextResponse.json({ error: 'creator_id, name, tagline, description, category, and repo_url are required' }, { status: 400 });
  }

  await registerSkill({
    creatorId: body.creator_id,
    name: body.name,
    tagline: body.tagline,
    description: body.description,
    category: body.category,
    repoUrl: body.repo_url,
  });

  return NextResponse.json({ ok: true });
}
