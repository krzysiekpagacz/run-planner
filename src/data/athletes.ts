import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { coachAthleteRelationships, users } from '@/db/schema';
import { requireCoach } from './users';

export interface Athlete {
  id: string;
  name: string | null;
  email: string;
  customName: string | null;
}

/** Athletes actively linked to the signed-in coach, ordered by name. */
export async function getMyAthletes(): Promise<Athlete[]> {
  const coach = await requireCoach();

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      customName: coachAthleteRelationships.customName,
    })
    .from(coachAthleteRelationships)
    .innerJoin(users, eq(users.id, coachAthleteRelationships.athleteId))
    .where(
      and(
        eq(coachAthleteRelationships.coachId, coach.id),
        eq(coachAthleteRelationships.status, 'active'),
      ),
    )
    .orderBy(asc(users.name));
}

/** Update the coach's custom label for one of their athletes. */
export async function updateAthleteCustomName(
  athleteId: string,
  customName: string,
): Promise<void> {
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

  if (!link) throw new Error('Forbidden');

  await db
    .update(coachAthleteRelationships)
    .set({ customName })
    .where(eq(coachAthleteRelationships.id, link.id));
}
