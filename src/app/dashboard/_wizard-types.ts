export const WORKOUT_TYPES = [
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
] as const;

export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  easy_run: 'Spokojny bieg',
  tempo_run: 'Tempo',
  interval_training: 'Interwały',
  long_run: 'Długi bieg',
  race: 'Zawody',
  rest: 'Odpoczynek',
  cross_training: 'Trening uzupełniający',
  strength: 'Siła',
  fartlek: 'Fartlek',
  hill_workout: 'Podbieganie',
};

export const SEGMENT_TYPES = [
  'warmup',
  'main_set',
  'cooldown',
  'recovery',
  'build',
] as const;

export type SegmentType = (typeof SEGMENT_TYPES)[number];

export const SEGMENT_TYPE_LABELS: Record<SegmentType, string> = {
  warmup: 'Rozgrzewka',
  main_set: 'Część główna',
  cooldown: 'Wyciszenie',
  recovery: 'Regeneracja',
  build: 'Nabieganie',
};

export interface TrainingDetailsDraft {
  scheduledDate: string;
  workoutType: WorkoutType;
  title: string;
  notes: string;
}

export interface SegmentDraft {
  segmentType: SegmentType;
  measurement: 'distance' | 'time';
  intensity: 'heart_rate' | 'pace';
  repetitions: number;
  distanceMeters?: number;
  durationMinutes?: number;
  heartRateMin?: number;
  heartRateMax?: number;
  paceMinSecondsPerKm?: number;
  paceMaxSecondsPerKm?: number;
  notes: string;
}
