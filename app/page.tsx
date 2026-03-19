import { HomeDashboard } from '@/components/dashboard';
import { getDashboardData } from '@/lib/resolvetip';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { programs, creators, skills, bindings, spotlights, transfers } = await getDashboardData();
  return (
    <HomeDashboard
      bindings={bindings}
      creators={creators}
      program={programs[0]}
      skills={skills}
      spotlights={spotlights}
      transfers={transfers}
    />
  );
}
