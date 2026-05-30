import { redirect } from 'next/navigation';
import { getAthleteWorkouts, getCoachAthletes, getCurrentUser } from '@/db/queries';
import { MonthlyTrainingTable } from './_monthly-training-table';
import { CoachDashboard, type CoachAthlete } from './_coach-dashboard';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  // The layout already guards auth + onboarding; this is a safety net.
  if (!user) redirect('/');

  if (user.role === 'coach') {
    const athletes = await getCoachAthletes(user.id);
    const withWorkouts: CoachAthlete[] = await Promise.all(
      athletes.map(async (athlete) => ({
        ...athlete,
        workouts: await getAthleteWorkouts(athlete.id),
      })),
    );

    return (
      <main className="container mx-auto px-4 py-8">
        <CoachDashboard athletes={withWorkouts} />
      </main>
    );
  }

  const workouts = await getAthleteWorkouts(user.id);

  return (
    <main className="container mx-auto px-4 py-8">
      <MonthlyTrainingTable workouts={workouts} />
    </main>
  );
}
