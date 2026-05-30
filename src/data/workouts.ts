import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { coachAthleteRelationships, workouts } from '@/db/schema';
import { getCurrentUser, requireCoach } from './users';

export interface WorkoutRow {
  id: string;
  // 'yyyy-MM-dd' — Drizzle returns `date` columns as strings; kept serializable
  scheduledDate: string;
  title: string;
  workoutType: (typeof workouts.workoutType.enumValues)[number];
  totalDistanceMeters: number | null;
  totalDurationMinutes: number | null;
  notes: string | null;
}

const workoutColumns = {
  id: workouts.id,
  scheduledDate: workouts.scheduledDate,
  title: workouts.title,
  workoutType: workouts.workoutType,
  totalDistanceMeters: workouts.totalDistanceMeters,
  totalDurationMinutes: workouts.totalDurationMinutes,
  notes: workouts.notes,
};

/** The signed-in user's OWN workouts. Scoped to the session — no id is accepted. */
export async function getMyWorkouts(): Promise<WorkoutRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  return db
    .select(workoutColumns)
    .from(workouts)
    .where(eq(workouts.athleteId, user.id)) // can only ever be OUR rows
    .orderBy(asc(workouts.scheduledDate));
}

/**
 * An athlete's workouts, readable by a COACH — but only if an active relationship links
 * the signed-in coach to that athlete. Otherwise returns nothing.
 */
export async function getAthleteWorkoutsForCoach(athleteId: string): Promise<WorkoutRow[]> {
  const coach = await requireCoach();

  const [link] = await db
    .select({ id: coachAthleteRelationships.id })
    .from(coachAthleteRelationships)
    .where(
      and(
        eq(coachAthleteRelationships.coachId, coach.id),
        eq(coachAthleteRelationships.athleteId, athleteId),
        eq(coachAthleteRelationships.status, 'active'),
      ),
    )
    .limit(1);

  if (!link) return []; // not your athlete → no access, full stop.

  return db
    .select(workoutColumns)
    .from(workouts)
    .where(eq(workouts.athleteId, athleteId))
    .orderBy(asc(workouts.scheduledDate));
}
