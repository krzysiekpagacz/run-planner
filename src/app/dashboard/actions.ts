'use server';

import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import {
  updateAthleteCustomName,
  createTrainingWithSegments,
  deleteTraining,
  updateTrainingWithSegments,
  updateWorkoutNotes,
  updateSegmentNotes,
} from '@/data';
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

function resolveTitle(title: string | undefined, workoutType: string, scheduledDate: string) {
  return (
    title?.trim() ||
    `${WORKOUT_TYPE_LABELS[workoutType as keyof typeof WORKOUT_TYPE_LABELS]} · ${format(parseISO(scheduledDate), 'dd.MM.yyyy')}`
  );
}

export async function createTrainingAction(
  input: CreateTrainingPayload,
): Promise<{ success: true } | { error: string }> {
  const parsed = CreateTrainingSchema.safeParse(input);
  if (!parsed.success) return { error: 'Nieprawidłowe dane formularza.' };

  const { title, workoutType, scheduledDate } = parsed.data;
  try {
    await createTrainingWithSegments({
      ...parsed.data,
      title: resolveTitle(title, workoutType, scheduledDate),
    });
    return { success: true };
  } catch {
    return { error: 'Nie udało się zapisać treningu.' };
  }
}

const UpdateTrainingSchema = CreateTrainingSchema.extend({
  workoutId: z.string().uuid(),
});

export type UpdateTrainingPayload = z.infer<typeof UpdateTrainingSchema>;

export async function updateTrainingAction(
  input: UpdateTrainingPayload,
): Promise<{ success: true } | { error: string }> {
  const parsed = UpdateTrainingSchema.safeParse(input);
  if (!parsed.success) return { error: 'Nieprawidłowe dane formularza.' };

  const { workoutId, title, workoutType, scheduledDate, ...rest } = parsed.data;
  try {
    await updateTrainingWithSegments(workoutId, {
      ...rest,
      workoutType,
      scheduledDate,
      title: resolveTitle(title, workoutType, scheduledDate),
    });
    return { success: true };
  } catch {
    return { error: 'Nie udało się zaktualizować treningu.' };
  }
}

const UpdateWorkoutNotesSchema = z.object({
  workoutId: z.string().uuid(),
  notes: z.string().nullable(),
});

export async function updateWorkoutNotesAction(
  input: z.infer<typeof UpdateWorkoutNotesSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = UpdateWorkoutNotesSchema.safeParse(input);
  if (!parsed.success) return { error: 'Nieprawidłowe dane.' };
  try {
    await updateWorkoutNotes(parsed.data.workoutId, parsed.data.notes);
    return { success: true };
  } catch {
    return { error: 'Nie udało się zapisać notatek.' };
  }
}

const UpdateSegmentNotesSchema = z.object({
  segmentId: z.string().uuid(),
  notes: z.string().nullable(),
});

export async function updateSegmentNotesAction(
  input: z.infer<typeof UpdateSegmentNotesSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = UpdateSegmentNotesSchema.safeParse(input);
  if (!parsed.success) return { error: 'Nieprawidłowe dane.' };
  try {
    await updateSegmentNotes(parsed.data.segmentId, parsed.data.notes);
    return { success: true };
  } catch {
    return { error: 'Nie udało się zapisać notatek.' };
  }
}

const DeleteTrainingSchema = z.object({ workoutId: z.string().uuid() });

export async function deleteTrainingAction(
  input: z.infer<typeof DeleteTrainingSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = DeleteTrainingSchema.safeParse(input);
  if (!parsed.success) return { error: 'Nieprawidłowe dane.' };

  try {
    await deleteTraining(parsed.data.workoutId);
    return { success: true };
  } catch {
    return { error: 'Nie udało się usunąć treningu.' };
  }
}
