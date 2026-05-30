import { redirect } from 'next/navigation';
import { getAthleteWorkoutsForCoach, getMyAthletes, getMyWorkouts, getCurrentUser } from '@/data';
import { MonthlyTrainingTable } from './_monthly-training-table';
import { CoachDashboard, type CoachAthlete } from './_coach-dashboard';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  // The layout already guards auth + onboarding; this is a safety net.
  if (!user) redirect('/');

  if (user.role === 'coach') {
    const athletes = await getMyAthletes();
    const withWorkouts: CoachAthlete[] = await Promise.all(
      athletes.map(async (athlete) => ({
        ...athlete,
        workouts: await getAthleteWorkoutsForCoach(athlete.id),
      })),
    );

    return (
      <main className="container mx-auto px-4 py-8">
        <CoachDashboard athletes={withWorkouts} />
      </main>
    );
  }

  const workouts = await getMyWorkouts();

  return (
    <main className="container mx-auto px-4 py-8">
      <MonthlyTrainingTable workouts={workouts} />
    </main>
  );
}
