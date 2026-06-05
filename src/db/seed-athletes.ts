if (process.env.NODE_ENV === 'production') {
  console.error('Seed scripts must not run in production.');
  process.exit(1);
}

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { users, coachAthleteRelationships } from './schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

const COACH_CLERK_ID = 'user_3ERGi7HLQrhIvQ4gqNvtmVeUe0d';

const ATHLETES = [
  { clerkId: 'user_fake_athlete_001', email: 'anna.kowalska@example.com', name: 'Anna Kowalska' },
  { clerkId: 'user_fake_athlete_002', email: 'piotr.nowak@example.com', name: 'Piotr Nowak' },
  { clerkId: 'user_fake_athlete_003', email: 'marta.wisniewski@example.com', name: 'Marta Wiśniewska' },
  { clerkId: 'user_fake_athlete_004', email: 'tomasz.wojcik@example.com', name: 'Tomasz Wójcik' },
  { clerkId: 'user_fake_athlete_005', email: 'karolina.lewandowska@example.com', name: 'Karolina Lewandowska' },
  { clerkId: 'user_fake_athlete_006', email: 'marek.kaminski@example.com', name: 'Marek Kamiński' },
];

async function main() {
  const [coach] = await db.select().from(users).where(eq(users.clerkId, COACH_CLERK_ID));
  if (!coach) {
    console.error(`Coach with clerkId ${COACH_CLERK_ID} not found.`);
    process.exit(1);
  }
  console.log(`Coach found: ${coach.email} (${coach.id})`);

  for (const athlete of ATHLETES) {
    const [inserted] = await db
      .insert(users)
      .values({ clerkId: athlete.clerkId, email: athlete.email, name: athlete.name, role: 'athlete' })
      .onConflictDoNothing()
      .returning();

    let athleteId: string;
    if (inserted) {
      athleteId = inserted.id;
      console.log(`Created athlete: ${athlete.name} (${athleteId})`);
    } else {
      const [existing] = await db.select().from(users).where(eq(users.clerkId, athlete.clerkId));
      athleteId = existing.id;
      console.log(`Athlete already exists: ${athlete.name} (${athleteId})`);
    }

    await db
      .insert(coachAthleteRelationships)
      .values({ coachId: coach.id, athleteId, status: 'active' })
      .onConflictDoNothing();
    console.log(`  → relationship created with coach`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
