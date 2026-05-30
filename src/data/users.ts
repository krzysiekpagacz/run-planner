import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  role: 'coach' | 'athlete';
}

/** The signed-in user, resolved from Clerk → the `users` table (source of truth). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  return user ?? null;
}

/**
 * The signed-in user, guaranteed to be a coach — throws otherwise. Used by helpers
 * that read athlete data on a coach's behalf so authorization is derived from the
 * session, never from a caller-supplied id.
 */
export async function requireCoach(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'coach') {
    throw new Error('Forbidden: coach access required');
  }
  return user;
}
