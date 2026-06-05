import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { coachAthleteRelationships, workouts, workoutSegments } from '@/db/schema';
import { getCurrentUser, requireCoach } from './users';

export interface SegmentRow {
  id: string;
  orderIndex: number;
  segmentType: (typeof workoutSegments.segmentType.enumValues)[number];
  repetitions: number;
  distanceMeters: number | null;
  durationMinutes: number | null;
  paceMinSecondsPerKm: number | null;
  paceMaxSecondsPerKm: number | null;
  heartRateMin: number | null;
  heartRateMax: number | null;
  notes: string | null;
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
  segments: SegmentRow[];
}

// Raw flat row returned by the LEFT JOIN before grouping
type RawRow = {
  id: string;
  scheduledDate: string;
  title: string;
  workoutType: (typeof workouts.workoutType.enumValues)[number];
  totalDistanceMeters: number | null;
  totalDurationMinutes: number | null;
  notes: string | null;
  segId: string | null;
  segOrderIndex: number | null;
  segType: (typeof workoutSegments.segmentType.enumValues)[number] | null;
  segReps: number | null;
  segDist: number | null;
  segDur: number | null;
  segPaceMin: number | null;
  segPaceMax: number | null;
  segHrMin: number | null;
  segHrMax: number | null;
  segNotes: string | null;
};

function toWorkoutRows(rawRows: RawRow[]): WorkoutRow[] {
  const map = new Map<string, WorkoutRow>();
  for (const row of rawRows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        scheduledDate: row.scheduledDate,
        title: row.title,
        workoutType: row.workoutType,
        totalDistanceMeters: row.totalDistanceMeters,
        totalDurationMinutes: row.totalDurationMinutes,
        notes: row.notes,
        segments: [],
      });
    }
    if (
      row.segId !== null &&
      row.segType !== null &&
      row.segReps !== null &&
      row.segOrderIndex !== null
    ) {
      map.get(row.id)!.segments.push({
        id: row.segId,
        orderIndex: row.segOrderIndex,
        segmentType: row.segType,
        repetitions: row.segReps,
        distanceMeters: row.segDist,
        durationMinutes: row.segDur,
        paceMinSecondsPerKm: row.segPaceMin,
        paceMaxSecondsPerKm: row.segPaceMax,
        heartRateMin: row.segHrMin,
        heartRateMax: row.segHrMax,
        notes: row.segNotes,
      });
    }
  }
  return Array.from(map.values());
}

const joinColumns = {
  id: workouts.id,
  scheduledDate: workouts.scheduledDate,
  title: workouts.title,
  workoutType: workouts.workoutType,
  totalDistanceMeters: workouts.totalDistanceMeters,
  totalDurationMinutes: workouts.totalDurationMinutes,
  notes: workouts.notes,
  segId: workoutSegments.id,
  segOrderIndex: workoutSegments.orderIndex,
  segType: workoutSegments.segmentType,
  segReps: workoutSegments.repetitions,
  segDist: workoutSegments.distanceMeters,
  segDur: workoutSegments.durationMinutes,
  segPaceMin: workoutSegments.paceMinSecondsPerKm,
  segPaceMax: workoutSegments.paceMaxSecondsPerKm,
  segHrMin: workoutSegments.heartRateMin,
  segHrMax: workoutSegments.heartRateMax,
  segNotes: workoutSegments.notes,
};

/** The signed-in user's OWN workouts, including all segments. Scoped to the session. */
export async function getMyWorkouts(): Promise<WorkoutRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await db
    .select(joinColumns)
    .from(workouts)
    .leftJoin(workoutSegments, eq(workoutSegments.workoutId, workouts.id))
    .where(eq(workouts.athleteId, user.id))
    .orderBy(asc(workouts.scheduledDate), asc(workoutSegments.orderIndex));

  return toWorkoutRows(rows as RawRow[]);
}

/**
 * An athlete's workouts (with segments), readable by a COACH — only if an active
 * relationship links the signed-in coach to that athlete.
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

  if (!link) return [];

  const rows = await db
    .select(joinColumns)
    .from(workouts)
    .leftJoin(workoutSegments, eq(workoutSegments.workoutId, workouts.id))
    .where(eq(workouts.athleteId, athleteId))
    .orderBy(asc(workouts.scheduledDate), asc(workoutSegments.orderIndex));

  return toWorkoutRows(rows as RawRow[]);
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

/** Deletes a workout and all its segments. Coach must own the workout. */
export async function deleteTraining(workoutId: string): Promise<void> {
  const coach = await requireCoach();

  const [row] = await db
    .select({ coachId: workouts.coachId })
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);

  if (!row || row.coachId !== coach.id) throw new Error('Forbidden');

  await db.delete(workoutSegments).where(eq(workoutSegments.workoutId, workoutId));
  await db.delete(workouts).where(eq(workouts.id, workoutId));
}

/**
 * Replaces a workout's editable fields and all its segments.
 * Coach must own the workout.
 */
export async function updateTrainingWithSegments(
  workoutId: string,
  input: CreateTrainingInput,
): Promise<void> {
  const coach = await requireCoach();

  const [row] = await db
    .select({ coachId: workouts.coachId })
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);

  if (!row || row.coachId !== coach.id) throw new Error('Forbidden');

  const totalDistanceMeters =
    input.segments.reduce(
      (sum, seg) => sum + (seg.distanceMeters ?? 0) * seg.repetitions,
      0,
    ) || null;

  await db
    .update(workouts)
    .set({
      scheduledDate: input.scheduledDate,
      title: input.title,
      workoutType: input.workoutType,
      totalDistanceMeters,
      notes: input.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(workouts.id, workoutId));

  await db.delete(workoutSegments).where(eq(workoutSegments.workoutId, workoutId));

  if (input.segments.length > 0) {
    await db.insert(workoutSegments).values(
      input.segments.map((seg, i) => ({
        workoutId,
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
  }
}
