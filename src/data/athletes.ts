import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { coachAthleteRelationships, users } from '@/db/schema';
import { requireCoach } from './users';

export interface Athlete {
  id: string;
  name: string | null;
  email: string;
}

/** Athletes actively linked to the signed-in coach, ordered by name. */
export async function getMyAthletes(): Promise<Athlete[]> {
  const coach = await requireCoach();

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
        eq(coachAthleteRelationships.coachId, coach.id),
        eq(coachAthleteRelationships.status, 'active'),
      ),
    )
    .orderBy(asc(users.name));
}
