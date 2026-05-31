import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // fallback to .env

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { users, stravaActivities } from './schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

function r(n: number) {
  return Math.round(n);
}

function jitter(base: number, range: number) {
  return base + r((Math.random() - 0.5) * range);
}

type ActivityData = {
  activityType: string;
  name: string;
  distanceMeters: number;
  durationSeconds: number;
  avgPaceSecondsPerKm: number;
  avgHeartRate: number;
  maxHeartRate: number;
  elevationGainMeters: number;
};

function easyRun(km: number): ActivityData {
  const pace = jitter(360, 20); // ~6:00/km
  return {
    activityType: 'Run',
    name: 'Morning Easy Run',
    distanceMeters: r(km * 1000),
    durationSeconds: r(km * pace),
    avgPaceSecondsPerKm: pace,
    avgHeartRate: jitter(138, 8),
    maxHeartRate: jitter(154, 6),
    elevationGainMeters: r(km * 8 + Math.random() * 20),
  };
}

function tempoRun(km: number): ActivityData {
  const pace = jitter(270, 10); // ~4:30/km
  return {
    activityType: 'Run',
    name: 'Tempo Run',
    distanceMeters: r(km * 1000),
    durationSeconds: r(km * pace),
    avgPaceSecondsPerKm: pace,
    avgHeartRate: jitter(163, 6),
    maxHeartRate: jitter(175, 4),
    elevationGainMeters: r(km * 10 + Math.random() * 15),
  };
}

function intervalRun(km: number): ActivityData {
  const pace = jitter(285, 15); // mix of fast intervals + recovery
  return {
    activityType: 'Run',
    name: 'Interval Training',
    distanceMeters: r(km * 1000),
    durationSeconds: r(km * pace),
    avgPaceSecondsPerKm: pace,
    avgHeartRate: jitter(168, 6),
    maxHeartRate: jitter(183, 4),
    elevationGainMeters: r(km * 5 + Math.random() * 10),
  };
}

function longRun(km: number): ActivityData {
  const pace = jitter(375, 15); // ~6:15/km
  return {
    activityType: 'Run',
    name: 'Long Run',
    distanceMeters: r(km * 1000),
    durationSeconds: r(km * pace),
    avgPaceSecondsPerKm: pace,
    avgHeartRate: jitter(142, 6),
    maxHeartRate: jitter(158, 4),
    elevationGainMeters: r(km * 12 + Math.random() * 30),
  };
}

// Day-of-week schedule (0=Sun … 6=Sat). null = rest day.
// Base distances in km — scaled by a weekly volume factor.
type Factory = (factor: number) => ActivityData;

const SCHEDULE: (Factory | null)[] = [
  (f) => easyRun(10 * f),    // Sun
  (f) => easyRun(8 * f),     // Mon
  (f) => tempoRun(10 * f),   // Tue
  (f) => easyRun(7 * f),     // Wed
  (f) => intervalRun(9 * f), // Thu
  null,                       // Fri — rest
  (f) => longRun(20 * f),    // Sat
];

// 4 weeks of volume: base → build → peak → recovery
const WEEKLY_FACTORS = [0.85, 1.0, 1.1, 0.7];

// Seed window: 4 weeks ending yesterday (2026-05-29)
const SEED_START = new Date('2026-05-02T00:00:00Z');
const SEED_END = new Date('2026-05-29T23:59:59Z');

async function main() {
  const athletes = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.role, 'athlete'));

  if (athletes.length === 0) {
    console.log('No athletes found — create an athlete account first, then re-run.');
    return;
  }

  console.log(`Seeding Strava activities for ${athletes.length} athlete(s)…`);

  for (const athlete of athletes) {
    const rows: (typeof stravaActivities.$inferInsert)[] = [];
    let dayIndex = 0;
    const cursor = new Date(SEED_START);

    while (cursor <= SEED_END) {
      const dow = cursor.getDay();
      const weekIndex = Math.min(Math.floor(dayIndex / 7), WEEKLY_FACTORS.length - 1);
      const factor = WEEKLY_FACTORS[weekIndex];
      const factory = SCHEDULE[dow];

      if (factory) {
        const activity = factory(factor);
        const startedAt = new Date(cursor);
        // Morning start between 06:00 and 07:59
        startedAt.setUTCHours(6 + Math.floor(Math.random() * 2), r(Math.random() * 59), 0, 0);

        const dateStr = cursor.toISOString().slice(0, 10).replace(/-/g, '');
        rows.push({
          userId: athlete.id,
          workoutId: null,
          stravaId: `fake_${athlete.id.slice(0, 8)}_${dateStr}`,
          startedAt,
          ...activity,
        });
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
      dayIndex++;
    }

    await db.insert(stravaActivities).values(rows).onConflictDoNothing();
    console.log(`  ${athlete.email}: ${rows.length} activities inserted (skips existing)`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
