import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/data'
import RoleSelector from './_role-selector'

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  // If a role was already chosen, never show the chooser again — the DB row
  // is the source of truth (same check the dashboard layout uses).
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')

  return <RoleSelector />
}
