import { pgEnum, pgTable, integer, text, timestamp, uuid, date } from 'drizzle-orm/pg-core';

// ---------- Enums ----------

export const workoutTypeEnum = pgEnum('workout_type', [
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
]);

export const segmentTypeEnum = pgEnum('segment_type', [
  'warmup',
  'main_set',
  'cooldown',
  'recovery',
  'build',
]);

export const relationshipStatusEnum = pgEnum('relationship_status', [
  'pending',
  'active',
  'inactive',
]);

// ---------- Tables ----------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role', { enum: ['coach', 'athlete'] }).notNull().default('athlete'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Links coaches to the athletes they manage
export const coachAthleteRelationships = pgTable('coach_athlete_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  coachId: uuid('coach_id').notNull().references(() => users.id),
  athleteId: uuid('athlete_id').notNull().references(() => users.id),
  status: relationshipStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Optional named block grouping multiple workouts (e.g. "Spring Marathon Block")
export const trainingPlans = pgTable('training_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  coachId: uuid('coach_id').notNull().references(() => users.id),
  athleteId: uuid('athlete_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// One calendar entry per day — plan_id nullable for standalone daily assignments
export const workouts = pgTable('workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').references(() => trainingPlans.id),
  coachId: uuid('coach_id').notNull().references(() => users.id),
  athleteId: uuid('athlete_id').notNull().references(() => users.id),
  scheduledDate: date('scheduled_date').notNull(),
  title: text('title').notNull(),
  workoutType: workoutTypeEnum('workout_type').notNull(),
  totalDurationMinutes: integer('total_duration_minutes'),
  totalDistanceMeters: integer('total_distance_meters'),
  notes: text('notes'),
  orderInDay: integer('order_in_day').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Interval segments within a workout — "3×5 km at 4:10–4:20/km" = 1 row with repetitions=3
export const workoutSegments = pgTable('workout_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  workoutId: uuid('workout_id').notNull().references(() => workouts.id),
  orderIndex: integer('order_index').notNull(),
  segmentType: segmentTypeEnum('segment_type').notNull(),
  repetitions: integer('repetitions').notNull().default(1),
  distanceMeters: integer('distance_meters'),
  durationMinutes: integer('duration_minutes'),
  // Pace stored as seconds/km — 4:30/km = 270 s/km
  paceMinSecondsPerKm: integer('pace_min_seconds_per_km'),
  paceMaxSecondsPerKm: integer('pace_max_seconds_per_km'),
  heartRateMin: integer('heart_rate_min'),
  heartRateMax: integer('heart_rate_max'),
  notes: text('notes'),
});

// Strava-synced completed activities; links to planned workout when matched
export const stravaActivities = pgTable('strava_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  workoutId: uuid('workout_id').references(() => workouts.id),
  stravaId: text('strava_id').notNull().unique(),
  name: text('name').notNull(),
  activityType: text('activity_type').notNull(),
  startedAt: timestamp('started_at').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  distanceMeters: integer('distance_meters'),
  avgPaceSecondsPerKm: integer('avg_pace_seconds_per_km'),
  avgHeartRate: integer('avg_heart_rate'),
  maxHeartRate: integer('max_heart_rate'),
  elevationGainMeters: integer('elevation_gain_meters'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
