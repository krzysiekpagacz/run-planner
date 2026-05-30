import { auth } from '@clerk/nextjs/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { coachAthleteRelationships, users, workouts } from '@/db/schema';

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  role: 'coach' | 'athlete';
}

export interface Athlete {
  id: string;
  name: string | null;
  email: string;
}

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

/** The signed-in user, resolved from Clerk → the `users` table (source of truth). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  return user ?? null;
}

/** Athletes actively linked to the given coach, ordered by name. */
export async function getCoachAthletes(coachId: string): Promise<Athlete[]> {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(coachAthleteRelationships)
    .innerJoin(users, eq(users.id, coachAthleteRelationships.athleteId))
    .where(
      and(
        eq(coachAthleteRelationships.coachId, coachId),
        eq(coachAthleteRelationships.status, 'active'),
      ),
    )
    .orderBy(asc(users.name));
}

/** All workouts for an athlete, ordered by scheduled date. */
export async function getAthleteWorkouts(athleteId: string): Promise<WorkoutRow[]> {
  return db
    .select({
      id: workouts.id,
      scheduledDate: workouts.scheduledDate,
      title: workouts.title,
      workoutType: workouts.workoutType,
      totalDistanceMeters: workouts.totalDistanceMeters,
      totalDurationMinutes: workouts.totalDurationMinutes,
      notes: workouts.notes,
    })
    .from(workouts)
    .where(eq(workouts.athleteId, athleteId))
    .orderBy(asc(workouts.scheduledDate));
}
