'use server';

import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { updateAthleteCustomName, createTrainingWithSegments } from '@/data';
import { WORKOUT_TYPE_LABELS } from './_wizard-types';

export async function updateAthleteCustomNameAction(
  athleteId: string,
  customName: string,
): Promise<{ success: true } | { error: string }> {
  try {
    await updateAthleteCustomName(athleteId, customName);
    return { success: true };
  } catch {
    return { error: 'Nie udało się zapisać nazwy.' };
  }
}

const SegmentSchema = z.object({
  segmentType: z.enum(['warmup', 'main_set', 'cooldown', 'recovery', 'build']),
  repetitions: z.number().int().min(1),
  distanceMeters: z.number().int().min(1).nullable().optional(),
  durationMinutes: z.number().int().min(1).nullable().optional(),
  paceMinSecondsPerKm: z.number().int().min(1).nullable().optional(),
  paceMaxSecondsPerKm: z.number().int().min(1).nullable().optional(),
  heartRateMin: z.number().int().min(1).nullable().optional(),
  heartRateMax: z.number().int().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const CreateTrainingSchema = z.object({
  athleteId: z.string().uuid(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workoutType: z.enum([
    'easy_run',
    'tempo_run',
    'interval_training',
    'long_run',
    'race',
    'rest',
    'cross_training',
    'strength',
    'fartlek',
    'hill_workout',
  ]),
  title: z.string().optional(),
  notes: z.string().optional(),
  segments: z.array(SegmentSchema).min(1),
});

export type CreateTrainingPayload = z.infer<typeof CreateTrainingSchema>;

export async function createTrainingAction(
  input: CreateTrainingPayload,
): Promise<{ success: true } | { error: string }> {
  const parsed = CreateTrainingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Nieprawidłowe dane formularza.' };
  }

  const { title, workoutType, scheduledDate } = parsed.data;
  const resolvedTitle =
    title?.trim() ||
    `${WORKOUT_TYPE_LABELS[workoutType]} · ${format(parseISO(scheduledDate), 'dd.MM.yyyy')}`;

  try {
    await createTrainingWithSegments({
      ...parsed.data,
      title: resolvedTitle,
    });
    return { success: true };
  } catch {
    return { error: 'Nie udało się zapisać treningu.' };
  }
}
