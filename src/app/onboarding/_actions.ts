'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import { users } from '@/db/schema'
export async function completeOnboarding(role: 'coach' | 'athlete') {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthenticated')

  const clerk = await clerkClient()
  const clerkUser = await clerk.users.getUser(userId)

  await db
    .insert(users)
    .values({
      clerkId: userId,
      email: clerkUser.emailAddresses[0].emailAddress,
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
      role,
    })
    .onConflictDoUpdate({ target: users.clerkId, set: { role } })

  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { role, onboardingComplete: true },
  })
}
