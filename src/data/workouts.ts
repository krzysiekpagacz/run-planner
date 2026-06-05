import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { coachAthleteRelationships, workouts, workoutSegments } from '@/db/schema';
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

export interface SegmentInput {
  segmentType: (typeof workoutSegments.segmentType.enumValues)[number];
  repetitions: number;
  distanceMeters?: number | null;
  durationMinutes?: number | null;
  paceMinSecondsPerKm?: number | null;
  paceMaxSecondsPerKm?: number | null;
  heartRateMin?: number | null;
  heartRateMax?: number | null;
  notes?: string | null;
}

export interface CreateTrainingInput {
  athleteId: string;
  scheduledDate: string;
  workoutType: (typeof workouts.workoutType.enumValues)[number];
  title: string;
  notes?: string | null;
  segments: SegmentInput[];
}

/**
 * Creates a workout and all its segments in two sequential inserts.
 * Authorization: requires an active coach–athlete relationship.
 */
export async function createTrainingWithSegments(
  input: CreateTrainingInput,
): Promise<{ id: string }> {
  const coach = await requireCoach();

  const [link] = await db
    .select({ id: coachAthleteRelationships.id })
    .from(coachAthleteRelationships)
    .where(
      and(
        eq(coachAthleteRelationships.coachId, coach.id),
        eq(coachAthleteRelationships.athleteId, input.athleteId),
        eq(coachAthleteRelationships.status, 'active'),
      ),
    )
    .limit(1);

  if (!link) throw new Error('Forbidden: no active relationship');

  const totalDistanceMeters =
    input.segments.reduce(
      (sum, seg) => sum + (seg.distanceMeters ?? 0) * seg.repetitions,
      0,
    ) || null;

  const [workout] = await db
    .insert(workouts)
    .values({
      coachId: coach.id,
      athleteId: input.athleteId,
      scheduledDate: input.scheduledDate,
      title: input.title,
      workoutType: input.workoutType,
      totalDistanceMeters,
      notes: input.notes ?? null,
    })
    .returning({ id: workouts.id });

  await db.insert(workoutSegments).values(
    input.segments.map((seg, i) => ({
      workoutId: workout.id,
      orderIndex: i,
      segmentType: seg.segmentType,
      repetitions: seg.repetitions,
      distanceMeters: seg.distanceMeters ?? null,
      durationMinutes: seg.durationMinutes ?? null,
      paceMinSecondsPerKm: seg.paceMinSecondsPerKm ?? null,
      paceMaxSecondsPerKm: seg.paceMaxSecondsPerKm ?? null,
      heartRateMin: seg.heartRateMin ?? null,
      heartRateMax: seg.heartRateMax ?? null,
      notes: seg.notes ?? null,
    })),
  );

  return { id: workout.id };
}
